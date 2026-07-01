"""ChromaDB RAG service — loads store policies and retrieves relevant chunks."""

from __future__ import annotations

import os
from pathlib import Path

import chromadb
from chromadb.config import Settings

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Module-level ChromaDB client and collection references
_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None

COLLECTION_NAME = "store_policies"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping chunks by character count,
    respecting paragraph boundaries where possible.
    """
    paragraphs = text.split("\n\n")
    chunks: list[str] = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{para}" if current_chunk else para
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            # If a single paragraph exceeds chunk_size, split it by sentences
            if len(para) > chunk_size:
                words = para.split()
                current_chunk = ""
                for word in words:
                    if len(current_chunk) + len(word) + 1 > chunk_size:
                        chunks.append(current_chunk.strip())
                        # Keep overlap
                        overlap_words = current_chunk.split()[-overlap // 10 :] if overlap else []
                        current_chunk = " ".join(overlap_words) + " " + word
                    else:
                        current_chunk = f"{current_chunk} {word}" if current_chunk else word
            else:
                current_chunk = para

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def initialize_rag() -> None:
    """
    Load the store policies markdown, chunk it, and upsert into ChromaDB.
    Called once during application startup.
    """
    global _client, _collection

    chroma_host = os.getenv("CHROMA_HOST", "localhost")
    chroma_port = int(os.getenv("CHROMA_PORT", "8200"))

    try:
        _client = chromadb.HttpClient(host=chroma_host, port=chroma_port)
        logger.info("Connected to ChromaDB at %s:%d", chroma_host, chroma_port)
    except Exception:
        logger.warning("ChromaDB server not available, falling back to ephemeral client")
        _client = chromadb.EphemeralClient()

    # Load policy document
    policy_path = os.getenv("POLICY_DOC_PATH", "data/store_policies.md")
    resolved_path = Path(__file__).resolve().parent.parent.parent / policy_path

    if not resolved_path.exists():
        logger.error("Store policy document not found at %s", resolved_path)
        raise FileNotFoundError(f"Policy document not found: {resolved_path}")

    policy_text = resolved_path.read_text(encoding="utf-8")
    chunks = _chunk_text(policy_text)

    logger.info("Loaded %d policy chunks from %s", len(chunks), resolved_path.name)

    # Create or get collection (using default embedding function)
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "Store policy guidelines for expiry mitigation RAG"},
    )

    # Upsert all chunks
    ids = [f"policy_chunk_{i}" for i in range(len(chunks))]
    _collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=[{"source": "store_policies.md", "chunk_index": i} for i in range(len(chunks))],
    )

    logger.info("Upserted %d chunks into ChromaDB collection '%s'", len(chunks), COLLECTION_NAME)


def query_policies(query_text: str, n_results: int = 3) -> list[str]:
    """
    Query the ChromaDB collection for relevant policy chunks.
    Returns a list of text chunks ordered by relevance.
    """
    if _collection is None:
        logger.warning("ChromaDB collection not initialized — returning empty results")
        return []

    try:
        results = _collection.query(
            query_texts=[query_text],
            n_results=n_results,
        )
        documents = results.get("documents", [[]])[0]
        logger.info("Retrieved %d policy chunks for query", len(documents))
        return documents
    except Exception as exc:
        logger.error("ChromaDB query failed: %s", str(exc))
        return []
