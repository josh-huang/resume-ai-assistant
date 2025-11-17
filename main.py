"""
FastAPI entrypoint that exposes the Resume Assistant RAG endpoints.

The module initializes the retrieval chain once at startup so every request
can reuse the same vector store and language model clients.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.utils.rag_pipeline import build_rag_chain

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build the retrieval-augmented generation chain once so the backend can
# share cached embeddings, load persisted vector stores, and reuse model clients
# across incoming requests.
qa_chain = build_rag_chain()

class Query(BaseModel):
    """Request body schema for JSON-based /ask calls."""

    question: str


@app.get("/")
async def read_root():
    """Lightweight health check to verify the API is reachable."""

    return {"message": "Hello World"}

@app.get("/ask")
async def ask_get(question: str):
    """GET alternative so tools/browsers can hit /ask without crafting JSON."""
    result = qa_chain.invoke({"query": question})
    return {"answer": result["result"]}
