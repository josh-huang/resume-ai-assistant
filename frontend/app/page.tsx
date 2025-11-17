"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { KeyboardEvent } from "react";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000/ask";
const DEFAULT_ANSWER = "The assistant’s answer will appear here.";
const HISTORY_STORAGE_KEY = "resume-assistant:history";
const HISTORY_LIMIT = 15;
const SUGGESTED_QUESTIONS = [
  "Summarize Jiashu's experience with LLM tooling.",
  "What projects show leadership or mentoring?",
  "List the most recent work achievements.",
  "What skills would help a robotics role?",
];

type QAInteraction = {
  id: string;
  question: string;
  answer: string;
  askedAt: number;
};

const createHistoryEntry = (question: string, answer: string): QAInteraction => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`,
  question,
  answer,
  askedAt: Date.now(),
});

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>(DEFAULT_ANSWER);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAInteraction[]>([]);
  const [copied, setCopied] = useState(false);

  const backendUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND_URL,
    []
  );

  /**
   * Load and persist chat history from localStorage.
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch (error) {
      console.warn("Failed to parse history", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(-HISTORY_LIMIT))
    );
  }, [history]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const pushToHistory = useCallback((questionText: string, answerText: string) => {
    setHistory((prev) => {
      const next = [...prev, createHistoryEntry(questionText, answerText)];
      return next.slice(-HISTORY_LIMIT);
    });
  }, []);

  const handleAsk = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setAnswer("Please enter a question first.");
      return;
    }

    setCopied(false);
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
      const resolvedAnswer = data.answer ?? "No answer returned.";
      setAnswer(resolvedAnswer);
      pushToHistory(trimmed, resolvedAnswer);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unexpected error";
      setAnswer(message);
      pushToHistory(trimmed, message);
    } finally {
      setLoading(false);
      setStatus("");
    }
  }, [question, backendUrl, pushToHistory]);

  const handleTextareaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        (event.key === "Enter" || event.key === "NumpadEnter") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        if (!loading) {
          void handleAsk();
        }
      }
    },
    [handleAsk, loading]
  );

  const handleCopyAnswer = useCallback(async () => {
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer || trimmedAnswer === DEFAULT_ANSWER) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setStatus("Clipboard unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(trimmedAnswer);
      setCopied(true);
      setStatus("Copied!");
      setTimeout(() => setStatus(""), 1500);
    } catch (error) {
      console.error("Copy failed", error);
      setStatus("Clipboard unavailable");
    }
  }, [answer]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuestion(suggestion);
  }, []);

  const handleReuseQuestion = useCallback((entry: QAInteraction) => {
    setQuestion(entry.question);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const displayAnswer =
    answer && answer.trim().length > 0 ? answer : DEFAULT_ANSWER;
  const canCopy =
    answer.trim().length > 0 && answer.trim() !== DEFAULT_ANSWER && !loading;
  const hasHistory = history.length > 0;

  return (
    <main className="app">
      <div className="card">
        <h1>Resume Assistant</h1>
        <p className="subtitle">
          Ask natural-language questions about Jiashu’s resume or supporting documents.
        </p>

        <div className="suggestions">
          {SUGGESTED_QUESTIONS.map((prompt) => (
            <button
              key={prompt}
              className="suggestion-chip"
              type="button"
              onClick={() => handleSuggestionClick(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>

        <label className="input-label" htmlFor="question">
          Your question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="e.g. Where did Jiashu study?"
        />
        <p className="hint">Press Ctrl+Enter (or ⌘+Enter) to send.</p>

        <div className="controls">
          <button className="ask" onClick={handleAsk} disabled={loading}>
            {loading ? "Sending…" : "Ask"}
          </button>
          <span className="status">{status}</span>
        </div>

        <section className="answer">
          <div className="answer-bar">
            <strong>Latest answer</strong>
            <button
              type="button"
              className="copy"
              onClick={handleCopyAnswer}
              disabled={!canCopy}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="answer-body">{displayAnswer}</div>
        </section>

        <section className="history">
          <div className="history-head">
            <strong>Conversation history</strong>
            <button
              type="button"
              className="clear"
              onClick={handleClearHistory}
              disabled={!hasHistory}
            >
              Clear
            </button>
          </div>

          {!hasHistory ? (
            <p className="history-empty">
              You have not asked any questions yet. Try one of the suggestions above.
            </p>
          ) : (
            <ul className="history-list">
              {[...history].reverse().map((entry) => (
                <li key={entry.id} className="history-entry">
                  <div className="meta">
                    <span className="question">{entry.question}</span>
                    <time dateTime={new Date(entry.askedAt).toISOString()}>
                      {new Date(entry.askedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="answer-snippet">{entry.answer}</p>
                  <button
                    type="button"
                    className="reuse"
                    onClick={() => handleReuseQuestion(entry)}
                    disabled={loading}
                  >
                    Reuse question
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
