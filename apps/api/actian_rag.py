"""
Actian VectorAI DB helper for RAG (Retrieval-Augmented Generation).

Chunks extracted tax JSON into text segments, embeds them with
sentence-transformers/all-MiniLM-L6-v2, and stores/searches in Actian VectorAI DB.
"""

import json
import os
from typing import Optional

from sentence_transformers import SentenceTransformer

# Lazy-load the Actian client to avoid import errors when Docker isn't running
_cortex_client = None
_embedding_model = None

ACTIAN_HOST = os.getenv("ACTIAN_HOST", "localhost:50051")
COLLECTION_NAME = "tax_documents"
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2


def _get_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


from cortex import CortexClient, DistanceMetric

def init_collection():
    """Create the tax_documents collection if it doesn't exist."""
    with CortexClient(ACTIAN_HOST) as client:
        if not client.has_collection(COLLECTION_NAME):
            client.create_collection(
                name=COLLECTION_NAME,
                dimension=EMBEDDING_DIM,
                distance_metric=DistanceMetric.COSINE,
            )


def _flatten_json(data: dict, prefix: str = "") -> list[str]:
    """Recursively flatten a nested JSON dict into human-readable text chunks."""
    chunks = []
    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            chunks.extend(_flatten_json(value, full_key))
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    chunks.extend(_flatten_json(item, f"{full_key}[{i}]"))
                else:
                    chunks.append(f"{full_key}[{i}]: {item}")
        else:
            chunks.append(f"{full_key}: {value}")
    return chunks


def _chunk_tax_data(doc_id: str, data: dict) -> list[dict]:
    """
    Convert extracted tax JSON into searchable text chunks with metadata.
    Groups related fields together for better semantic search.
    """
    results = []

    # Create a summary chunk
    profile = data.get("taxpayer_profile", {})
    if profile:
        summary_lines = [f"Taxpayer: {profile.get('first_name', '')} {profile.get('last_name', '')}"]
        for k, v in profile.items():
            if k not in ("first_name", "last_name"):
                summary_lines.append(f"  {k}: {v}")
        results.append({
            "text": "\n".join(summary_lines),
            "section": "taxpayer_profile",
            "doc_id": doc_id,
        })

    # Create per-document chunks for each tax year
    for record in data.get("tax_records", []):
        tax_year = record.get("tax_year", "unknown")
        filed_in = record.get("filed_in_year", "unknown")

        for doc_type, doc_data in record.get("documents", {}).items():
            if isinstance(doc_data, dict):
                lines = [f"Tax Year {tax_year} (filed {filed_in}) — {doc_type}"]
                flat = _flatten_json(doc_data)
                lines.extend(f"  {line}" for line in flat)
                results.append({
                    "text": "\n".join(lines),
                    "section": f"{doc_type}_{tax_year}",
                    "doc_id": doc_id,
                })

    # If nothing was structured, flatten the whole thing
    if not results:
        flat = _flatten_json(data)
        results.append({
            "text": "\n".join(flat),
            "section": "full_document",
            "doc_id": doc_id,
        })

    return results


def embed_and_upsert(doc_id: str, extracted_json: dict):
    """Chunk the extracted JSON, embed, and upsert to Actian."""
    model = _get_model()
    init_collection()

    chunks = _chunk_tax_data(doc_id, extracted_json)

    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts).tolist()

    ids = []
    payloads = []
    for i, chunk in enumerate(chunks):
        # Use a deterministic ID based on doc_id + chunk index
        vec_id = hash(f"{doc_id}_{i}") & 0x7FFFFFFF  # positive 32-bit int
        ids.append(vec_id)
        payloads.append({
            "doc_id": doc_id,
            "section": chunk["section"],
            "text": chunk["text"],
        })

    with CortexClient(ACTIAN_HOST) as client:
        client.batch_upsert(
            COLLECTION_NAME,
            ids=ids,
            vectors=embeddings,
            payloads=payloads,
        )

    return {"chunks_inserted": len(chunks), "doc_id": doc_id}


def search_tax_info(query: str, top_k: int = 5, doc_id: Optional[str] = None) -> list[dict]:
    """Search Actian for tax document chunks matching the query."""
    model = _get_model()
    query_vec = model.encode([query])[0].tolist()

    with CortexClient(ACTIAN_HOST) as client:
        f = None
        if doc_id:
            from cortex.filters import Filter, Field
            f = Filter().must(Field("doc_id").eq(doc_id))

        results = client.search(
            COLLECTION_NAME,
            query_vec,
            top_k=top_k,
            filter=f,
            with_payload=True
        )

    return [
        {
            "score": r.score,
            "text": r.payload.get("text", ""),
            "section": r.payload.get("section", ""),
            "doc_id": r.payload.get("doc_id", ""),
        }
        for r in results
    ]


def delete_doc_vectors(doc_id: str):
    """Remove all vectors for a given doc_id from Actian."""
    with CortexClient(ACTIAN_HOST) as client:
        if not client.has_collection(COLLECTION_NAME):
            return

        # Scroll through and delete matching vectors
        try:
            cursor = 0
            while True:
                page = client.scroll(COLLECTION_NAME, limit=100, cursor=cursor)
                if not page:
                    break
                for vec in page:
                    if vec.payload.get("doc_id") == doc_id:
                        client.delete(COLLECTION_NAME, vec.id)
                cursor += len(page)
                if len(page) < 100:
                    break
        except Exception:
            pass  # best-effort cleanup


def clear_all_vectors() -> dict:
    """Delete the whole tax collection and recreate it empty."""
    with CortexClient(ACTIAN_HOST) as client:
        if client.has_collection(COLLECTION_NAME):
            client.delete_collection(COLLECTION_NAME)

    init_collection()
    return {"cleared": True, "collection": COLLECTION_NAME}
