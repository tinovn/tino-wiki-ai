"""
BGE-M3 Embedding Service
Provides /embed and /embed/batch endpoints compatible with tino-wiki-ai backend.
"""

import os
import logging
from typing import List

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("MODEL_NAME", "BAAI/bge-m3")
DEVICE = os.getenv("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))
MODEL_CACHE = os.getenv("MODEL_CACHE", "/app/models")

app = FastAPI(title="Tino Wiki Embedding Service", version="1.0.0")

model: SentenceTransformer = None


@app.on_event("startup")
async def load_model():
    global model
    logger.info(f"Loading model {MODEL_NAME} on {DEVICE}...")
    model = SentenceTransformer(MODEL_NAME, cache_folder=MODEL_CACHE, device=DEVICE)
    logger.info(f"Model loaded. Dimensions: {model.get_sentence_embedding_dimension()}")


# ── Request/Response models ──────────────


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]
    model: str
    dimensions: int


class BatchEmbedRequest(BaseModel):
    texts: List[str]


class BatchEmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimensions: int
    count: int


# ── Endpoints ────────────────────────────


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "ready": model is not None,
    }


@app.post("/embed", response_model=EmbedResponse)
async def embed_single(req: EmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    embedding = model.encode(req.text, normalize_embeddings=True).tolist()
    return EmbedResponse(
        embedding=embedding,
        model=MODEL_NAME,
        dimensions=len(embedding),
    )


@app.post("/embed/batch", response_model=BatchEmbedResponse)
async def embed_batch(req: BatchEmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not req.texts:
        raise HTTPException(status_code=400, detail="Empty texts list")

    embeddings = model.encode(
        req.texts, batch_size=BATCH_SIZE, normalize_embeddings=True
    ).tolist()

    return BatchEmbedResponse(
        embeddings=embeddings,
        model=MODEL_NAME,
        dimensions=len(embeddings[0]) if embeddings else 0,
        count=len(embeddings),
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
