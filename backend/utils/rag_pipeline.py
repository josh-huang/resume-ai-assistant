"""
Helper utilities for building the retrieval-augmented generation (RAG) chain
that powers the Resume Assistant backend.

The functions in this module ingest resume materials from disk, chunk them into
retrieval-friendly segments, and wire up LangChain components to produce a
simple question-answering chain.
"""

import os
from docx import Document as DocxDocument
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

load_dotenv()

def _resolve_docs_dir():
    """Return the absolute path to the resumeMaterial directory."""

    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "resumeMaterial")
    )


def _load_text_file(path):
    """Load a UTF-8 text file into a LangChain Document with metadata."""

    with open(path, "r", encoding="utf-8") as infile:
        content = infile.read()
    return Document(page_content=content, metadata={"source": path})


def _load_docx_file(path):
    """Extract paragraphs from a .docx file and return a Document."""

    doc = DocxDocument(path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    content = "\n".join(paragraphs)
    return Document(page_content=content, metadata={"source": path})


def _split_documents(documents, chunk_size=1000, chunk_overlap=150):
    """Split Documents into overlapping chunks suitable for retrieval."""

    split_docs = []
    for doc in documents:
        text = doc.page_content or ""
        metadata = dict(doc.metadata or {})
        start = 0
        while start < len(text):
            end = min(len(text), start + chunk_size)
            chunk_text = text[start:end]
            chunk_metadata = metadata.copy()
            chunk_metadata["chunk_start"] = start
            chunk_metadata["chunk_end"] = end
            split_docs.append(Document(page_content=chunk_text, metadata=chunk_metadata))
            if end == len(text):
                break
            start = max(0, end - chunk_overlap)
    return split_docs


def build_rag_chain():
    """
    Build and return a thin wrapper around a LangChain runnable that can
    answer questions about the ingested resume materials.
    """

    docs_dir = _resolve_docs_dir()
    all_docs = []

    # Load .txt and .docx files
    for root, _, files in os.walk(docs_dir):
        for filename in files:
            full_path = os.path.join(root, filename)
            if filename.endswith(".txt"):
                all_docs.append(_load_text_file(full_path))
            elif filename.endswith(".docx"):
                all_docs.append(_load_docx_file(full_path))

    if not all_docs:
        raise ValueError(f"No documents were loaded from {docs_dir}")

    # Split into chunks
    split_docs = _split_documents(all_docs, chunk_size=1000, chunk_overlap=150)

    # Embed and store
    embeddings = OpenAIEmbeddings()
    vector_store = FAISS.from_documents(split_docs, embeddings)
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    model_name = os.getenv("OPENAI_LLM_MODEL")
    temperature = 0
    llm = ChatOpenAI(model=model_name, temperature=temperature)
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are an AI Resume Assistant representing Huang Jiashu, a Software Engineer specializing in "
                "backend development, Oracle APEX systems, and AI-driven applications. Jiashu is passionate about "
                "machine learning and artificial intelligence.\n\n"
                "Your role is to help users understand his experience, projects, and technical skills.\n\n"
                "Primarily base your answers on the provided resume context. You may add light, positive phrasing "
                "to give a good professional impression of Jiashu, but do not invent specific facts that are not "
                "supported by the context.\n\n"
                "If the context does not contain the information needed to answer a question, respond with: "
                "\"I'm not sure, please refer to the resume for details.\"\n\n"
                "Keep responses concise, factual, and professional."
            ),
        ),
        (
            "human",
            (
                "Context:\n{context}\n\n"
                "User Question: {question}\n\n"
                "Respond naturally as if you're the AI version of Huang Jiashu introducing his experience."
            ),
        ),
    ])

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    extract_query = RunnableLambda(lambda inputs: inputs["query"])
    context_builder = extract_query | retriever | RunnableLambda(format_docs)
    runnable = (
        {"context": context_builder, "question": extract_query}
        | prompt
        | llm
        | StrOutputParser()
    )

    class SimpleQAChain:
        """Compatibility wrapper that returns dicts instead of raw strings."""

        def __init__(self, inner):
            self._inner = inner

        def invoke(self, inputs, **kwargs):
            result = self._inner.invoke(inputs, **kwargs)
            return {"result": result}

    return SimpleQAChain(runnable)
