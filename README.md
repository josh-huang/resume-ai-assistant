# Resume Assistant

FastAPI + Next.js application that answers questions about Huang Jiashu’s resume
materials using a lightweight retrieval-augmented generation (RAG) workflow.
The backend ingests Word and text documents stored in `backend/resumeMaterial/`
and exposes a `/ask` endpoint; the frontend provides a single-page chat
experience for quickly querying the assistant.

## Architecture
- `main.py`: FastAPI entrypoint and REST surface for the RAG chain.
- `backend/utils/rag_pipeline.py`: Document ingestion, chunking, embeddings, and
  LangChain wiring for the assistant.
- `frontend/`: Next 14 client-side UI that calls the `/ask` endpoint via fetch.

## Requirements
- Python 3.11+ with pip
- Node.js 18+ and npm
- OpenAI API access (the project relies on `langchain-openai`)
- FAISS CPU bindings (`faiss-cpu`) for vector storage

## Backend setup
1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   source .venv/bin/activate  # macOS/Linux
   ```
2. Install dependencies (adjust as needed):
   ```bash
   pip install fastapi uvicorn python-dotenv python-docx \
       langchain langchain-community langchain-openai faiss-cpu
   ```
3. Create a `.env` file in the project root:
   ```ini
   OPENAI_API_KEY=sk-...
   OPENAI_LLM_MODEL=gpt-4o-mini
   ```
4. Place your resume artifacts inside `backend/resumeMaterial/`. Both `.docx` and
   `.txt` files are supported and will be chunked automatically.

Start the API with:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend setup
```bash
cd frontend
npm install
npm run dev
```
The UI reads `NEXT_PUBLIC_BACKEND_URL` (default `http://127.0.0.1:8000/ask`). Set
it in a `.env.local` file if you deploy the backend elsewhere:
```env
NEXT_PUBLIC_BACKEND_URL=https://mydomain.com/ask
```

## Quick test
With both services running locally:
```bash
curl "http://127.0.0.1:8000/ask?question=Where%20did%20Jiashu%20study%3F"
```

## Deployment notes
- Lock dependencies in `requirements.txt` / `package-lock.json` before pushing to
  production.
- Scope CORS in `main.py` if your frontend will live on a specific origin.
- Rotate API keys regularly and never commit `.env` files to version control.

