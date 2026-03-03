"""Embedding Service - BGE-M3 for Vietnamese text.
Also provides OpenAI-compatible /v1/embeddings endpoint for Chatwoot Captain.
"""

import os
import time
import logging
from typing import List, Optional, Union
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import numpy as np

from embedding_models.bge_m3 import BGEEmbedding

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance
embedding_model: Optional[BGEEmbedding] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global embedding_model

    # Startup: Load model
    logger.info("Loading BGE-M3 embedding model...")
    model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
    embedding_model = BGEEmbedding(model_name)
    logger.info(f"Model loaded successfully: {model_name}")

    yield

    # Shutdown
    logger.info("Shutting down embedding service")
    embedding_model = None


app = FastAPI(
    title="Embedding Service",
    description="BGE-M3 embedding service for Vietnamese text",
    version="1.0.0",
    lifespan=lifespan
)


# Request/Response models
class EmbedRequest(BaseModel):
    """Single text embedding request."""
    text: str = Field(..., min_length=1, max_length=8192)


class EmbedBatchRequest(BaseModel):
    """Batch text embedding request."""
    texts: List[str] = Field(..., min_length=1, max_length=100)


class EmbedResponse(BaseModel):
    """Embedding response."""
    embedding: List[float]
    dimension: int
    model: str


class EmbedBatchResponse(BaseModel):
    """Batch embedding response."""
    embeddings: List[List[float]]
    dimension: int
    model: str
    count: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model: str
    dimension: int


class OpenAIEmbeddingRequest(BaseModel):
    """OpenAI-compatible embedding request."""
    input: Union[str, List[str]]
    model: str = "BAAI/bge-m3"
    encoding_format: str = "float"


# ── Endpoints ────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return HealthResponse(
        status="healthy",
        model=embedding_model.model_name,
        dimension=embedding_model.dimension
    )


@app.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    """Generate embedding for a single text."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        embedding = embedding_model.encode(request.text)
        return EmbedResponse(
            embedding=embedding.tolist(),
            dimension=len(embedding),
            model=embedding_model.model_name
        )
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed/batch", response_model=EmbedBatchResponse)
async def embed_batch(request: EmbedBatchRequest):
    """Generate embeddings for multiple texts."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        embeddings = embedding_model.encode_batch(request.texts)
        return EmbedBatchResponse(
            embeddings=[e.tolist() for e in embeddings],
            dimension=embedding_model.dimension,
            model=embedding_model.model_name,
            count=len(embeddings)
        )
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/similarity")
async def compute_similarity(
    text1: str,
    text2: str
) -> dict:
    """Compute cosine similarity between two texts."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        emb1 = embedding_model.encode(text1)
        emb2 = embedding_model.encode(text2)

        # Cosine similarity
        similarity = float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

        return {
            "similarity": similarity,
            "text1_length": len(text1),
            "text2_length": len(text2)
        }
    except Exception as e:
        logger.error(f"Similarity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/info")
async def model_info():
    """Get model information."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "model_name": embedding_model.model_name,
        "dimension": embedding_model.dimension,
        "max_length": embedding_model.max_length,
        "pooling": "cls"
    }


# ── OpenAI-compatible endpoints (for Chatwoot Captain) ──


@app.post("/v1/embeddings")
async def openai_embeddings(req: OpenAIEmbeddingRequest):
    """OpenAI-compatible embedding endpoint."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    texts = [req.input] if isinstance(req.input, str) else req.input
    if not texts:
        raise HTTPException(status_code=400, detail="Empty input")

    try:
        embeddings = embedding_model.encode_batch(texts)
        total_tokens = sum(len(t.split()) for t in texts)
        return {
            "object": "list",
            "data": [
                {"object": "embedding", "index": i, "embedding": emb.tolist()}
                for i, emb in enumerate(embeddings)
            ],
            "model": embedding_model.model_name,
            "usage": {"prompt_tokens": total_tokens, "total_tokens": total_tokens},
        }
    except Exception as e:
        logger.error(f"OpenAI embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible model listing."""
    model_name = embedding_model.model_name if embedding_model else "unknown"
    return {
        "object": "list",
        "data": [
            {
                "id": model_name,
                "object": "model",
                "created": int(time.time()),
                "owned_by": "local",
            }
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
