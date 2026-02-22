import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from google import genai
from google.genai import types, errors as genai_errors

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000"]}})

PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

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

@app.post("/v1/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    active_doc_ids = payload.get("active_doc_ids") or []

    if not message:
        return jsonify({"error": "Missing message"}), 400

    doc_ctx, sources = build_doc_context(active_doc_ids)

    system = (
        "You are TaxPilot, an educational tax filing assistant. "
        "When Document Context is provided, ground your answer in it. "
        "If context is missing, ask which return/document to use. "
        "Always include the sentence: 'Educational only, not tax advice.' "
        "Be concise, structured, and action-oriented."
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
        return jsonify({"answer": answer, "sources": sources})
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