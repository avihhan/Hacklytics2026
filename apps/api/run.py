import os
import uuid
import json
import re
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

def _to_number(value):
    """Best-effort numeric coercion for extracted tax values."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    # Keep only characters that can appear in number-like tax fields.
    cleaned = re.sub(r"[^0-9.\-(),]", "", raw)
    if not cleaned:
        return None
    negative = cleaned.startswith("(") and cleaned.endswith(")")
    cleaned = cleaned.strip("()").replace(",", "")
    try:
        parsed = float(cleaned)
    except ValueError:
        return None
    return -parsed if negative else parsed

def _iter_kv(node):
    """Yield (key, value) pairs recursively from nested JSON-like structures."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield k, v
            yield from _iter_kv(v)
    elif isinstance(node, list):
        for item in node:
            yield from _iter_kv(item)

def _derive_filing_status(extracted: dict):
    profile = extracted.get("taxpayer_profile") or {}
    status = profile.get("filing_status")
    if isinstance(status, str) and status.strip():
        return status.strip()

    for key, value in _iter_kv(extracted):
        key_l = str(key).lower()
        if "filing status" in key_l:
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, bool) and value:
                # Ex: "Filing Status - Single": true
                parts = str(key).split("-")
                candidate = parts[-1].strip() if len(parts) > 1 else str(key).strip()
                if candidate:
                    return candidate
    return "Not Filed"

def _derive_employers(extracted: dict) -> list[str]:
    """Find and return unique employer names from the extracted JSON."""
    employers = set()
    for key, value in _iter_kv(extracted):
        key_l = str(key).lower()
        if key_l in ("employer", "employer_name", "company", "company_name"):
            if isinstance(value, str) and value.strip():
                # Avoid capturing generic labels or EINs if possible, just take the string
                val_stripped = value.strip()
                if len(val_stripped) > 2 and "ein" not in val_stripped.lower():
                    employers.add(val_stripped)
    return sorted(list(employers))

def _derive_state(extracted: dict):
    profile = extracted.get("taxpayer_profile") or {}
    for key in ["state_of_residence", "state", "state_code"]:
        value = profile.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    for key, value in _iter_kv(profile):
        if "state" in str(key).lower() and isinstance(value, str) and value.strip():
            return value.strip()
    return None

def _derive_taxpayer_name(extracted: dict):
    profile = extracted.get("taxpayer_profile") or {}
    first = str(profile.get("first_name") or "").strip()
    last = str(profile.get("last_name") or "").strip()
    full = f"{first} {last}".strip()
    return full or None

def _derive_income(extracted: dict):
    """Estimate income by preferring common canonical totals from extracted fields."""
    ranked_candidates = []
    for key, value in _iter_kv(extracted):
        key_l = str(key).lower()
        amount = _to_number(value)
        if amount is None or amount < 0:
            continue

        score = None
        if "adjusted gross income" in key_l or key_l == "agi":
            score = 100
        elif "total income" in key_l:
            score = 90
        elif "line 9" in key_l and ("1040" in key_l or "income" in key_l):
            score = 80
        elif "line 1a" in key_l and ("w-2" in key_l or "wages" in key_l):
            score = 70
        elif "wages" in key_l and "box 1" in key_l:
            score = 60

        if score is not None:
            ranked_candidates.append((score, amount))

    if not ranked_candidates:
        return None
    ranked_candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return ranked_candidates[0][1]

def _build_dashboard_summary():
    manifest = _load_manifest()
    docs_uploaded = len(manifest)
    docs_needed = 5
    docs_extracted = 0
    rag_completed = 0
    rag_failed = 0
    forms_seen = set()
    years_seen = set()
    keyword_blob_parts = []
    latest_uploaded_doc = None

    for entry in manifest:
        rag_status = str(entry.get("rag_status", "")).lower()
        if rag_status.startswith("completed"):
            rag_completed += 1
        elif rag_status.startswith("failed"):
            rag_failed += 1

        extracted_path = EXTRACTED_DIR / f"{entry['doc_id']}.json"
        if not extracted_path.exists():
            continue
        docs_extracted += 1

        try:
            extracted = json.loads(extracted_path.read_text())
        except Exception:
            continue

        for record in extracted.get("tax_records", []) or []:
            year = record.get("tax_year")
            if isinstance(year, int):
                years_seen.add(year)
            docs = record.get("documents", {}) or {}
            if isinstance(docs, dict):
                for form_name in docs.keys():
                    forms_seen.add(str(form_name))

        keyword_blob_parts.append(json.dumps(extracted).lower())

        if latest_uploaded_doc is None or entry.get("uploaded_at", 0) > latest_uploaded_doc.get("uploaded_at", 0):
            latest_uploaded_doc = {"entry": entry, "extracted": extracted}

    latest_extracted = (latest_uploaded_doc or {}).get("extracted") if latest_uploaded_doc else {}
    taxpayer_name = _derive_taxpayer_name(latest_extracted or {})
    filing_status = _derive_filing_status(latest_extracted or {})
    state = _derive_state(latest_extracted or {}) or "Unknown"
    est_income = _derive_income(latest_extracted or {})
    
    # We aggregate employers from ALL extracted docs to find all of them
    all_employers = set()
    for entry in manifest:
        extracted_path = EXTRACTED_DIR / f"{entry['doc_id']}.json"
        if extracted_path.exists():
            try:
                extracted = json.loads(extracted_path.read_text())
                all_employers.update(_derive_employers(extracted))
            except Exception:
                pass
    employers_list = sorted(list(all_employers))

    extraction_ratio = (docs_extracted / docs_uploaded) if docs_uploaded else 0
    docs_ratio = min(docs_uploaded / docs_needed, 1.0)
    base_score = (docs_ratio * 60.0) + (extraction_ratio * 30.0)
    if filing_status != "Not Filed":
        base_score += 5.0
    if state != "Unknown":
        base_score += 5.0
    readiness_score = int(round(min(base_score, 100.0)))

    blob = " ".join(keyword_blob_parts)
    flags = []
    if "1098-e" in blob or "student loan" in blob:
        flags.append({
            "title": "Student loan interest review",
            "impact": "Medium",
            "confidence": "High",
            "why": "Detected student-loan-related fields in extracted documents.",
            "needed": ["Confirm 1098-E amount", "MAGI threshold check"],
        })
    if "1098-t" in blob or "tuition" in blob or "education" in blob:
        flags.append({
            "title": "Education credit check (AOTC/LLC)",
            "impact": "High",
            "confidence": "Med",
            "why": "Education-related fields were found; credits may be available.",
            "needed": ["Form 1098-T", "Qualified expense receipts"],
        })
    if "schedule a" in blob or "mortgage" in blob or "charity" in blob or "medical" in blob:
        flags.append({
            "title": "Itemized deduction comparison",
            "impact": "Low",
            "confidence": "Med",
            "why": "Potential itemizable categories appear in extracted data.",
            "needed": ["Mortgage interest (1098)", "Donation receipts", "Medical totals"],
        })

    if not flags:
        flags.append({
            "title": "Add more supporting documents",
            "impact": "Medium",
            "confidence": "Med",
            "why": "More uploaded forms will improve coverage and confidence.",
            "needed": ["W-2/1099 forms", "1098 forms", "Prior-year 1040 if available"],
        })

    return {
        "snapshot": {
            "taxpayer_name": taxpayer_name,
            "filing_status": filing_status,
            "state": state,
            "est_income": int(est_income) if est_income is not None else None,
            "docs_uploaded": docs_uploaded,
            "docs_needed": docs_needed,
            "docs_extracted": docs_extracted,
            "employers": employers_list,
            "latest_tax_year": max(years_seen) if years_seen else None,
        },
        "readiness": {
            "score": readiness_score,
            "extraction_status": "Complete" if docs_uploaded > 0 and docs_extracted == docs_uploaded else "In progress",
            "rag_completed": rag_completed,
            "rag_failed": rag_failed,
        },
        "flags": flags,
        "meta": {
            "forms_detected": sorted(forms_seen),
            "years_detected": sorted(years_seen, reverse=True),
        },
    }

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

@app.get("/v1/dashboard")
def dashboard_summary():
    return jsonify(_build_dashboard_summary())


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
