"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { KeyboardEvent } from "react";
import { Github, Linkedin, Mail, Menu, Phone, X } from "lucide-react";
import { motion } from "framer-motion";
import { resumeData } from "../lib/resume";

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


const RESUME_SECTION_LINKS = [
  { id: "resume-education", label: "Education" },
  { id: "resume-experience", label: "Experience" },
  { id: "resume-projects", label: "Projects" },
  { id: "resume-skills", label: "Skills" },
  { id: "resume-certifications", label: "Certifications" },
];

const SITE_MENU_LINKS = [
  { id: "about", label: "About" },
  { id: "assistant", label: "AI Assistant" },
  ...RESUME_SECTION_LINKS,
];

const HERO_HIGHLIGHTS = [
  { value: "5+", label: "Years in backend & IoT systems" },
  { value: "3", label: "AI products shipped" },
  { value: "12+", label: "Enterprise workflows automated" },
];

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>(DEFAULT_ANSWER);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAInteraction[]>([]);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (sidebarOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }
    return () => {
      document.body.classList.remove("sidebar-open");
    };
  }, [sidebarOpen]);

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

  const handleScrollToSection = useCallback(
    (sectionId: string) => {
      if (typeof document === "undefined") {
        return;
      }
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setSidebarOpen(false);
    },
    [setSidebarOpen]
  );

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const focusAssistantSection = useCallback(() => {
    handleScrollToSection("assistant");
    if (typeof document === "undefined") {
      return;
    }
    const textarea = document.getElementById("question") as
      | HTMLTextAreaElement
      | null;
    textarea?.focus();
  }, [handleScrollToSection]);

  const focusProjectsSection = useCallback(() => {
    handleScrollToSection("resume-projects");
  }, [handleScrollToSection]);

  const displayAnswer =
    answer && answer.trim().length > 0 ? answer : DEFAULT_ANSWER;
  const canCopy =
    answer.trim().length > 0 && answer.trim() !== DEFAULT_ANSWER && !loading;
  const hasHistory = history.length > 0;

  return (
    <main className="site-main">
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={handleCloseSidebar}
      />
      <div className="site-shell">
        <aside
          className={`site-sidebar ${sidebarOpen ? "open" : ""}`}
          aria-label="Site navigation"
        >
          <div className="sidebar-inner">
            <div className="sidebar-header">
              <div className="sidebar-avatar">JH</div>
              <div className="sidebar-heading">
                <p className="sidebar-eyebrow">AI systems engineer</p>
                <h2>{resumeData.basics.name}</h2>
                <p className="sidebar-tagline">
                  Building AI copilots, automation, and delightful UX.
                </p>
              </div>
              <button
                type="button"
                className="sidebar-close"
                onClick={handleCloseSidebar}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <p className="sidebar-summary">{resumeData.profile}</p>
            <nav className="sidebar-nav" aria-label="Site sections">
              {SITE_MENU_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className="sidebar-link"
                  onClick={() => handleScrollToSection(link.id)}
                >
                  <span>{link.label}</span>
                </button>
              ))}
            </nav>
            <div className="sidebar-cta">
              <button
                type="button"
                className="ask"
                onClick={focusAssistantSection}
              >
                Launch AI assistant
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={focusProjectsSection}
              >
                Browse resume
              </button>
            </div>
            <div className="sidebar-social">
              <a
                href={`mailto:${resumeData.basics.email}`}
                aria-label="Email Jiashu"
              >
                <Mail size={18} />
              </a>
              <a
                href={resumeData.basics.linkedInUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn profile"
              >
                <Linkedin size={18} />
              </a>
              <a
                href={resumeData.basics.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub profile"
              >
                <Github size={18} />
              </a>
              <a
                href={`tel:${resumeData.basics.phone.replace(/\s+/g, "")}`}
                aria-label="Call Jiashu"
              >
                <Phone size={18} />
              </a>
            </div>
            <div className="sidebar-footer">
              <span>Based in Singapore · Open to AI product roles</span>
            </div>
          </div>
        </aside>
        <div className="site-content">
          <div className="site-toolbar">
            <button
              type="button"
              className="toolbar-menu"
              onClick={handleOpenSidebar}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <Menu size={18} />
              <span>Menu</span>
            </button>
            <span className="toolbar-pill">
              Fast iterations · Reliable delivery
            </span>
          </div>
          <motion.header
            id="about"
            className="site-hero"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-intro">
              <p className="hero-eyebrow">AI Copilot Builder · Personal Site</p>
              <h1>Personalized AI that understands my story end-to-end.</h1>
              <p>
                I connect reliable backend services with retrieval-augmented
                generation and thoughtful UX so hiring teams can explore my work
                conversationally and with confidence.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="ask"
                  onClick={focusAssistantSection}
                >
                  Ask the assistant
                </button>
                <button
                  type="button"
                  className="ghost-button ghost-button--dark"
                  onClick={focusProjectsSection}
                >
                  Dive into projects
                </button>
              </div>
            </div>
            <motion.ul
              className="hero-stats"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {HERO_HIGHLIGHTS.map((highlight, index) => (
                <motion.li
                  key={highlight.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                >
                  <span>{highlight.value}</span>
                  <p>{highlight.label}</p>
                </motion.li>
              ))}
            </motion.ul>
          </motion.header>

          <div className="content-grid">
            <motion.section
              id="assistant"
              className="card assistant-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              <h1>Resume Assistant</h1>
              <p className="subtitle">
                Ask natural-language questions about Jiashu’s resume or supporting
                documents.
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
                    You have not asked any questions yet. Try one of the suggestions
                    above.
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
            </motion.section>

            <motion.aside
              className="card resume-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="resume-header">
                <h2>{resumeData.basics.name}</h2>
                <ul className="resume-contact">
                  <li>
                    <a href={`mailto:${resumeData.basics.email}`}>
                      {resumeData.basics.email}
                    </a>
                  </li>
                  <li>
                    <a href={`tel:${resumeData.basics.phone.replace(/\\s+/g, "")}`}>
                      {resumeData.basics.phone}
                    </a>
                  </li>
                  <li>
                    <a
                      href={resumeData.basics.linkedInUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {`LinkedIn: ${resumeData.basics.linkedIn}`}
                    </a>
                  </li>
                  <li>
                    <a
                      href={resumeData.basics.github}
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub: josh-huang
                    </a>
                  </li>
                </ul>
                <p className="resume-summary">{resumeData.profile}</p>
              </div>

              <nav className="resume-nav" aria-label="Resume sections">
                {RESUME_SECTION_LINKS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleScrollToSection(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>

              <div className="resume-columns">
                <section id="resume-education" className="resume-section">
                  <h3>Education</h3>
                  <ul className="resume-list">
                    {resumeData.education.map((item) => (
                      <li key={item.school}>
                        <div className="resume-row">
                          <span className="resume-title">{item.school}</span>
                          <span className="resume-period">{item.period}</span>
                        </div>
                        <p>{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section id="resume-experience" className="resume-section">
                  <h3>Experience</h3>
                  <ul className="resume-list">
                    {resumeData.experience.map((job) => (
                      <li key={job.role}>
                        <div className="resume-row">
                          <span className="resume-title">{job.role}</span>
                          <span className="resume-period">{job.period}</span>
                        </div>
                        <p className="resume-meta">{job.org}</p>
                        <ul className="resume-bullets">
                          {job.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section id="resume-projects" className="resume-section">
                <h3>Highlighted Projects</h3>
                <ul className="resume-list">
                  {resumeData.projects.map((project) => (
                    <li key={`${project.title}-${project.period}`}>
                      <div className="resume-row">
                        <span className="resume-title">{project.title}</span>
                        <span className="resume-period">{project.period}</span>
                      </div>
                      <p className="resume-meta">{project.context}</p>
                      <ul className="resume-bullets">
                        {project.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="resume-columns resume-columns--compact">
                <section id="resume-skills" className="resume-section">
                  <h3>Skills & Tools</h3>
                  <dl className="resume-skills">
                    {resumeData.skills.map((skill) => (
                      <div key={skill.label}>
                        <dt>{skill.label}</dt>
                        <dd>{skill.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section id="resume-certifications" className="resume-section">
                  <h3>Certifications & Memberships</h3>
                  <ul className="resume-bullets resume-bullets--columns">
                    {resumeData.certifications.map((cert) => (
                      <li key={cert}>{cert}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </motion.aside>
          </div>
        </div>
      </div>
    </main>
  );
}
