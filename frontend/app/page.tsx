"use client";

// Minimal single-page UI for querying the Resume Assistant backend.
import { useCallback, useMemo, useState } from "react";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000/ask";

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("The assistant’s answer will appear here.");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const backendUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND_URL,
    []
  );

  /**
   * Call the FastAPI /ask endpoint with the current question and surface errors.
   */
  const handleAsk = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setAnswer("Please enter a question first.");
      return;
    }

    setLoading(true);
    setStatus("Thinking…");
    setAnswer("");

    try {
      const params = new URLSearchParams({ question: trimmed });
      const response = await fetch(`${backendUrl}?${params.toString()}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Request failed (${response.status}): ${text || "Unknown error"}`
        );
      }
      const data = await response.json();
      setAnswer(data.answer ?? "No answer returned.");
    } catch (error) {
      console.error(error);
      setAnswer(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(false);
      setStatus("");
    }
  }, [question, backendUrl]);

  return (
    <main className="app">
      <div className="card">
        <h1>Resume Assistant</h1>
        <p className="subtitle">
          Ask natural-language questions about Jiashu’s resume or supporting documents.
        </p>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. Where did Jiashu study?"
        />

        <div className="controls">
          <button className="ask" onClick={handleAsk} disabled={loading}>
            {loading ? "Sending…" : "Ask"}
          </button>
          <span className="status">{status}</span>
        </div>

        <section className="answer">{answer}</section>
      </div>
    </main>
  );
}
