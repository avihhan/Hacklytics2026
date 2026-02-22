import os
import uuid
import json
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from google import genai
from google.genai import types, errors as genai_errors

import actian_rag

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000"]}})

# ── Storage directories ──────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
EXTRACTED_DIR = BASE_DIR / "storage" / "extracted"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# TEMP doc store (replace later with real PDF extraction)
DOC_STORE = {
    "1040_2025": {
        "title": "Form 1040 • 2025",
        "text": "1040 summary: filing status single. AGI 74,250. Standard deduction applied.",
    },
    "w2_2025": {
        "title": "W-2 • 2025",
        "text": "W-2 summary: wages 74,250. Federal withholding 8,900. GA withholding 2,150.",
    },
    "1098e_2025": {
        "title": "1098-E • 2025",
        "text": "1098-E: student loan interest paid 612. Lender: Example Servicer.",
    },
}

def build_doc_context(active_doc_ids, max_chars=6000):
    sources = []
    chunks = []
    for doc_id in active_doc_ids:
        d = DOC_STORE.get(doc_id)
        if not d:
            continue
        sources.append({"doc": d["title"], "snippet": d["text"][:220]})
        chunks.append(f"[{doc_id}] {d['title']}\n{d['text']}\n")
    ctx = "\n".join(chunks).strip()
    if len(ctx) > max_chars:
        ctx = ctx[:max_chars] + "\n…(truncated)"
    return ctx, sources

def vertex_client():
    if not PROJECT:
        raise RuntimeError("Missing GOOGLE_CLOUD_PROJECT in apps/api/.env")
    return genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "service": "taxpilot-api",
        "vertex": True,
        "project": PROJECT,
        "location": LOCATION,
        "model": MODEL,
    })

# ── Manifest helpers ─────────────────────────────────────────────
MANIFEST_PATH = UPLOAD_DIR / "_manifest.json"

def _load_manifest() -> list[dict]:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text())
    return []

def _save_manifest(entries: list[dict]):
    MANIFEST_PATH.write_text(json.dumps(entries, indent=2))

# ── Upload / Delete / List ───────────────────────────────────────

@app.post("/v1/upload")
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"File type not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    doc_id = str(uuid.uuid4())
    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[1].lower() if "." in original_name else ""
    stored_name = f"{doc_id}.{ext}" if ext else doc_id

    dest = UPLOAD_DIR / stored_name
    file.save(str(dest))

    entry = {
        "doc_id": doc_id,
        "original_name": original_name,
        "stored_name": stored_name,
        "size": dest.stat().st_size,
        "type": file.content_type or "application/octet-stream",
        "uploaded_at": int(Path(dest).stat().st_mtime * 1000),
    }

    manifest = _load_manifest()
    manifest.insert(0, entry)
    _save_manifest(manifest)

    # Auto-trigger Gemini extraction (best-effort, don't block upload on failure)
    extraction_status = "skipped"
    rag_status = "skipped"
    if ext == "pdf":
        try:
            extracted = extract_tax_data(str(dest))
            out_path = EXTRACTED_DIR / f"{doc_id}.json"
            out_path.write_text(json.dumps(extracted, indent=2))
            extraction_status = "completed"
            # Auto-upsert to Actian for RAG
            try:
                actian_rag.embed_and_upsert(doc_id, extracted)
                rag_status = "completed"
            except Exception as e:
                rag_status = f"failed: {str(e)[:100]}"
        except Exception as e:
            extraction_status = f"failed: {str(e)[:100]}"

    entry["extraction_status"] = extraction_status
    entry["rag_status"] = rag_status
    return jsonify(entry), 201


@app.get("/v1/uploads")
def list_uploads():
    return jsonify(_load_manifest())


@app.delete("/v1/upload/<doc_id>")
def delete_upload(doc_id: str):
    manifest = _load_manifest()
    target = None
    for e in manifest:
        if e["doc_id"] == doc_id:
            target = e
            break

    if not target:
        return jsonify({"error": "Document not found"}), 404

    # Remove uploaded file
    upload_path = UPLOAD_DIR / target["stored_name"]
    if upload_path.exists():
        upload_path.unlink()

    # Remove extracted JSON if exists
    extracted_path = EXTRACTED_DIR / f"{doc_id}.json"
    if extracted_path.exists():
        extracted_path.unlink()

    manifest = [e for e in manifest if e["doc_id"] != doc_id]
    _save_manifest(manifest)

    return jsonify({"deleted": doc_id})


# ── Gemini PDF → JSON Extraction ─────────────────────────────────

# Base schema for guidance - Gemini is now instructed to be EXHAUSTIVE and expand this.
TAX_JSON_SCHEMA = """
{
  "taxpayer_profile": {
    "first_name": "string",
    "last_name": "string",
    "ssn": "string",
    "address": "string",
    "state_of_residence": "string",
    "occupation": "string"
  },
  "tax_records": [
    {
      "tax_year": 2024,
      "documents": {
        "Form_Name": {
          "field_label_or_box_number": "value"
        }
      }
    }
  ]
}
"""

def extract_tax_data(pdf_path: str) -> dict:
    """Send a PDF to Gemini 2.5 Flash and extract EVERY field into structured tax JSON."""
    client = vertex_client()

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    prompt = f"""You are a professional tax data extraction specialist. Your goal is to capture EVERY SINGLE piece of information from the provided tax document PDF with 100% accuracy.

Strict Guardrails to Prevent Hallucination:
1. ONLY extract information that is explicitly visible in the document.
2. DO NOT infer, calculate, or guess any values (e.g., don't calculate total wages if not explicitly listed).
3. If a box or field is empty or unreadable, OMIT it from the JSON. Do not use placeholders like "N/A" or "None" unless written in the text.
4. Extract text and numbers VERBATIM. Do not normalize names or addresses if they appear differently in the document.
5. If you are unsure about a value due to OCR quality, OMIT it rather than guessing.

Instructions:
1. Extract ALL key-value pairs, box numbers, labels, and values exactly as they appear.
2. Organise the output into a structured JSON format.
3. Use the following categories as a base, but ADD any additional fields or forms you encounter:
   - "taxpayer_profile": All personal info (Full names, SSNs, addresses, filing status, exemptions, spouse info if any).
   - "tax_records": An array of years found. Each item has a "documents" object.
   - Inside "documents", create keys for EVERY form found (e.g. "Form 1040", "Form W-2", "Form 1099-DIV").
4. For each form, include EVERY box found by its number and name (e.g., "Box 1 - Wages, tips, other compensation").
5. Return ONLY valid JSON, no markdown fences, no explanation.

Base schema for reference:
{TAX_JSON_SCHEMA}
"""

    resp = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                    types.Part(text=prompt),
                ],
            )
        ],
    )

    raw = (resp.text or "").strip()
    # Strip markdown fences if Gemini wraps the JSON
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3].strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    return json.loads(raw)


@app.post("/v1/extract/<doc_id>")
def extract_document(doc_id: str):
    """Extract tax data from an uploaded PDF using Gemini 2.5 Flash."""
    manifest = _load_manifest()
    target = next((e for e in manifest if e["doc_id"] == doc_id), None)

    if not target:
        return jsonify({"error": "Document not found"}), 404

    upload_path = UPLOAD_DIR / target["stored_name"]
    if not upload_path.exists():
        return jsonify({"error": "File missing from storage"}), 404

    try:
        extracted = extract_tax_data(str(upload_path))
    except json.JSONDecodeError as e:
        return jsonify({"error": "Gemini returned invalid JSON", "detail": str(e)}), 502
    except Exception as e:
        return jsonify({"error": "Extraction failed", "detail": str(e)}), 500

    # Save extracted JSON
    out_path = EXTRACTED_DIR / f"{doc_id}.json"
    out_path.write_text(json.dumps(extracted, indent=2))

    # Auto-upsert to Actian for RAG
    rag_status = "skipped"
    try:
        actian_rag.embed_and_upsert(doc_id, extracted)
        rag_status = "completed"
    except Exception as e:
        rag_status = f"failed: {str(e)[:100]}"

    return jsonify({"doc_id": doc_id, "extracted": extracted, "rag_status": rag_status})


@app.get("/v1/extracted/<doc_id>")
def get_extracted(doc_id: str):
    """Return previously extracted JSON for a document."""
    path = EXTRACTED_DIR / f"{doc_id}.json"
    if not path.exists():
        return jsonify({"error": "No extraction found for this document"}), 404
    return jsonify(json.loads(path.read_text()))


@app.post("/v1/search")
def search_documents():
    """Semantic search across all uploaded tax documents via Actian RAG."""
    payload = request.get_json(silent=True) or {}
    query = (payload.get("query") or "").strip()
    top_k = payload.get("top_k", 5)
    doc_id = payload.get("doc_id")  # optional: scope to a single doc

    if not query:
        return jsonify({"error": "Missing query"}), 400

    try:
        results = actian_rag.search_tax_info(query, top_k=top_k, doc_id=doc_id)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": "Search failed", "detail": str(e)}), 500


@app.post("/v1/voice/search")
def voice_search():
    """
    Dedicated endpoint for ElevenLabs Conversational AI Server Tool.
    Returns a consolidated text summary suitable for speech.
    """
    payload = request.get_json(silent=True) or {}
    query = (payload.get("query") or "").strip()
    
    if not query:
        return jsonify({"error": "Missing query"}), 400

    try:
        # Search for top context chunks
        results = actian_rag.search_tax_info(query, top_k=3)
        
        if not results:
            return jsonify({
                "response": "I couldn't find any specific information in the uploaded documents regarding that query."
            })

        # Consolidate into a single speakable string
        context_parts = [r["text"] for r in results]
        combined_text = "\n\n".join(context_parts)

        # Basic cleanup to make it sound better when spoken
        # (Remove technical markers, normalize some symbols)
        clean_text = combined_text.replace("—", " - ").replace("box_", "box ")
        
        return jsonify({
            "response": clean_text,
            "found": True,
            "count": len(results)
        })
    except Exception as e:
        return jsonify({"response": "I encountered an error while searching the document database."}), 500


@app.post("/v1/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    active_doc_ids = payload.get("active_doc_ids") or []

    if not message:
        return jsonify({"error": "Missing message"}), 400

    # Try Actian RAG first, fall back to hardcoded DOC_STORE
    doc_ctx = ""
    sources = []
    rag_used = False

    try:
        # Use the user's message as the semantic search query
        doc_id_filter = active_doc_ids[0] if len(active_doc_ids) == 1 else None
        rag_results = actian_rag.search_tax_info(message, top_k=5, doc_id=doc_id_filter)

        if rag_results:
            rag_used = True
            chunks = []
            for r in rag_results:
                chunks.append(r["text"])
                sources.append({"section": r["section"], "doc_id": r["doc_id"], "score": r["score"]})
            doc_ctx = "\n\n".join(chunks)
    except Exception:
        pass  # Actian unavailable — fall back

    if not rag_used:
        doc_ctx, sources = build_doc_context(active_doc_ids)

    system = (
        "You are TaxPilot, the expert flight navigator for tax preparation. Your mission is to help the user navigate their tax landscape with 100% accuracy.\n\n"
        "Operational Directives:\n"
        "1. Grounded Navigation: Use ONLY the provided 'Document Context'. If a data point isn't in your scans, report: 'I don't have that information in your flight logs (uploaded documents).'\n"
        "2. Professional Tone: You are steady, precise, and helpful—like an air traffic controller.\n"
        "3. Thematic Branding: Occasionally use subtle pilot/navigation metaphors (e.g., 'Scanning documents...', 'Navigating to Box 1...'), but keep the focus on the tax data.\n"
        "4. No Hallucinations: NEVER guess. Accuracy is your primary flight constraint.\n"
        "5. Markdown Excellence: Use the full range of Markdown (bolding, lists, tables) to make the 'flight plan' (answer) clear.\n"
        "6. Silence on Internals: Do not mention JSON, data formats, or technical implementation details. Refer only to the documents by their name (e.g., 'Form 1040', 'W-2')."
    )

    prompt = f"""{system}

Document Context:
{doc_ctx if doc_ctx else "(none provided)"}

User:
{message}
""".strip()

    try:
        client = vertex_client()
        resp = client.models.generate_content(
            model=MODEL,
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
        )
        answer = resp.text or ""
        return jsonify({"answer": answer, "sources": sources, "rag_used": rag_used})
    except genai_errors.APIError as e:
        # Vertex/Gemini API error
        return jsonify({
            "error": "Gemini/Vertex request failed",
            "detail": str(e),
            "project": PROJECT,
            "location": LOCATION,
            "model": MODEL,
        }), 500
    except Exception as e:
        return jsonify({
            "error": "Server error",
            "detail": str(e),
        }), 500

if __name__ == "__main__":
    print("Starting TaxPilot API on http://127.0.0.1:8000")
    app.run(host="0.0.0.0", port=8000, debug=True)