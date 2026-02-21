import os
import asyncio
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from google import genai
from google.genai import types
from fastmcp import Client

load_dotenv()

app = Flask(__name__)

# CORS so Next.js (localhost:3000) can call Flask (localhost:8000)
CORS(app, resources={r"/v1/*": {"origins": ["http://localhost:3000"]}})

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY in environment.")

# Gemini client (Developer API)
gemini = genai.Client(api_key=API_KEY)

# MCP client helper (STDIO). Client will spawn the server script automatically.
MCP_SERVER_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mcp", "taxpilot_mcp_server.py"))

async def _mcp_call(tool_name: str, args: dict) -> dict:
    async with Client(MCP_SERVER_PATH) as c:
        res = await c.call_tool(name=tool_name, arguments=args)
        # fastmcp returns a structured result
        return {"tool": tool_name, "args": args, "result": res}

def mcp_list_docs() -> dict:
    """MCP tool wrapper: list docs available to TaxPilot."""
    return asyncio.run(_mcp_call("list_docs", {}))

def mcp_search_docs(query: str, k: int = 3) -> dict:
    """MCP tool wrapper: search docs for relevant snippets."""
    return asyncio.run(_mcp_call("search_docs", {"query": query, "k": k}))

@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "taxpilot-chat-api"})

@app.post("/v1/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    history = payload.get("history") or []  # optional

    if not message:
        return jsonify({"error": "Missing 'message'"}), 400

    system = (
        "You are TaxPilot, an educational tax filing assistant. "
        "You MUST say 'Educational only, not tax advice' when giving tax-related guidance. "
        "Use tools to ground answers in uploaded documents when relevant."
    )

    # Automatic function calling: Gemini can call these Python functions as tools. :contentReference[oaicite:6]{index=6}
    config = types.GenerateContentConfig(
        tools=[mcp_list_docs, mcp_search_docs]
    )

    # Keeping it simple for now - single-turn chat , can add multi-turn history later
    contents = [
        types.Content(role="user", parts=[types.Part(text=f"{system}\n\nUser: {message}")])
    ]

    resp = gemini.models.generate_content(
        model="gemini-3-flash-preview",
        contents=contents,
        config=config,
    )

    return jsonify({
        "text": resp.text,
        # For debugging during hackathon, helpful to see what Gemini did
        "raw": {
            "candidates": len(resp.candidates) if getattr(resp, "candidates", None) else 0
        }
    })