from fastmcp import FastMCP

mcp = FastMCP("TaxPilot MCP")

# For now: mock “document store”. Later you’ll replace with real extracted text.
MOCK_DOCS = [
    {
        "doc_id": "w2_2025",
        "title": "W-2 (Employer) 2025",
        "text": "W-2 summary: wages 74,250. Federal withholding 8,900. State GA withholding 2,150."
    },
    {
        "doc_id": "1098e_2025",
        "title": "1098-E 2025",
        "text": "1098-E: student loan interest paid 612. Lender: Example Servicer."
    },
    {
        "doc_id": "1098t_2025",
        "title": "1098-T 2025",
        "text": "1098-T: tuition payments 12,400. Scholarships 4,000."
    },
]

@mcp.tool
def list_docs() -> dict:
    """List currently available TaxPilot documents (mock for now)."""
    return {
        "docs": [{"doc_id": d["doc_id"], "title": d["title"]} for d in MOCK_DOCS]
    }

@mcp.tool
def search_docs(query: str, k: int = 3) -> dict:
    """Search TaxPilot documents by keyword and return top-k snippets."""
    q = (query or "").lower().strip()
    hits = []
    for d in MOCK_DOCS:
        if q and (q in d["title"].lower() or q in d["text"].lower()):
            hits.append({
                "doc_id": d["doc_id"],
                "title": d["title"],
                "snippet": d["text"][:220]
            })
    return {"query": query, "hits": hits[: max(1, min(k, 10))]}

if __name__ == "__main__":
    # Default transport is STDIO (perfect for local dev)
    mcp.run()