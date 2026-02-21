import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000"]}})

API_KEY = os.getenv("GEMINI_API_KEY")

@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "taxpilot-api"})

# TEMP: mock doc store (we’ll replace with real PDF extraction later)
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

@app.post("/v1/chat")
def chat():
    if not API_KEY:
        return jsonify({"error": "Missing GEMINI_API_KEY in .env"}), 500

    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    active_doc_ids = payload.get("active_doc_ids") or []

    if not message:
        return jsonify({"error": "Missing message"}), 400

    doc_ctx, sources = build_doc_context(active_doc_ids)

    system = (
        "You are TaxPilot, an educational tax filing assistant. "
        "When Document Context is provided, ground your answer in it and cite it briefly. "
        "If context is missing, ask which document/return the user means. "
        "Always include the sentence: 'Educational only, not tax advice.' "
        "Be concise and action-oriented."
    )

    prompt = f"""{system}

Document Context:
{doc_ctx if doc_ctx else "(none provided)"}

User:
{message}
""".strip()

    client = genai.Client(api_key=API_KEY)

    resp = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
    )

    return jsonify({
        "answer": resp.text or "",
        "sources": sources,  
    })

if __name__ == "__main__":
    print("Starting TaxPilot API on http://127.0.0.1:8000")
    app.run(host="0.0.0.0", port=8000, debug=True)