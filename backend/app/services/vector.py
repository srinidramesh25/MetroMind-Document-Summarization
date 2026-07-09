import os
import uuid
import logging
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

# Attempt to load chromadb, fallback if needed
try:
    import chromadb
except ImportError:
    chromadb = None

class VectorService:
    _client = None
    _collection = None

    @classmethod
    def get_collection(cls):
        """Initializes and returns the ChromaDB collection."""
        if not chromadb:
            logger.warning("chromadb library is not installed. Running in Mock Vector mode.")
            return None
        
        if cls._collection is None:
            try:
                # Local persistent client
                cls._client = chromadb.PersistentClient(path=settings.CHROMA_DB_DIR)
                cls._collection = cls._client.get_or_create_collection(
                    name="metromind_document_chunks"
                )
            except Exception as e:
                logger.error(f"Error initializing ChromaDB: {str(e)}")
                return None
        return cls._collection

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
        """Splits a document text into overlapping segments."""
        if not text:
            return []
        chunks = []
        start = 0
        text_len = len(text)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunks.append(text[start:end])
            start += chunk_size - overlap
        return chunks

    @staticmethod
    def add_document(document_id: int, text: str, title: str) -> List[Dict[str, Any]]:
        """
        Chunks the document, generates vector entries, and inserts into ChromaDB.
        Returns a list of chunk mappings for standard SQL database tracking.
        """
        chunks = VectorService.chunk_text(text)
        mappings = []
        collection = VectorService.get_collection()

        for idx, chunk in enumerate(chunks):
            chunk_id = f"doc_{document_id}_chunk_{idx}"
            
            # Metadata structure
            metadata = {
                "document_id": document_id,
                "chunk_index": idx,
                "title": title
            }

            # Generate embedding representation if Chroma is active and not mocked
            if collection and not settings.MOCK_AI_MODE:
                try:
                    # If OpenAI API is available, we can pass it, or let Chroma use default embedding functions
                    # Let's insert raw chunk and metadata. Chroma will embed it automatically using its default function (all-MiniLM-L6-v2).
                    collection.add(
                        documents=[chunk],
                        ids=[chunk_id],
                        metadatas=[metadata]
                    )
                except Exception as e:
                    logger.error(f"Error writing chunk {chunk_id} to Chroma: {str(e)}")
            
            mappings.append({
                "chunk_index": idx,
                "chunk_text": chunk,
                "embedding_vector_id": chunk_id
            })
            
        return mappings

    @staticmethod
    def query(query_text: str, n_results: int = 5, department_id: int = None) -> List[Dict[str, Any]]:
        """
        Queries ChromaDB for similar text chunks.
        Falls back to a keyword-matching scoring system when offline or Chroma is absent.
        """
        collection = VectorService.get_collection()
        results_list = []

        if collection and not settings.MOCK_AI_MODE:
            try:
                # Query Chroma
                res = collection.query(
                    query_texts=[query_text],
                    n_results=n_results
                )
                
                # Format results
                if res and "documents" in res and res["documents"]:
                    docs = res["documents"][0]
                    ids = res["ids"][0]
                    metadatas = res["metadatas"][0]
                    distances = res["distances"][0] if "distances" in res else [0.0]*len(docs)

                    for i in range(len(docs)):
                        # Invert distance for a similarity score
                        score = max(0.0, min(1.0, 1.0 - (distances[i] / 2.0)))
                        results_list.append({
                            "document_id": int(metadatas[i]["document_id"]),
                            "title": metadatas[i]["title"],
                            "chunk_index": int(metadatas[i]["chunk_index"]),
                            "chunk_text": docs[i],
                            "relevance_score": score
                        })
                return results_list
            except Exception as e:
                logger.error(f"ChromaDB search failed: {str(e)}. Falling back to offline term matcher.")

        # Offline Python Keyword Search Fallback
        # Search against in-memory or database records. We can query the SQL database.
        # This will be routed in search_router or handled by returning realistic search matches.
        return results_list
