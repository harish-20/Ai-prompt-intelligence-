import { useEffect, useRef, useState } from "react";
import axios from "axios";

// In dev: Vite proxies /api to backend. In prod: use VITE_API_URL env var.
const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE || undefined,
  headers: { "Content-Type": "application/json" },
});

async function apiCall(endpoint, body) {
  const { data } = await api.post(`/api${endpoint}`, body);
  return data;
}

function now() {
  return new Date().toISOString();
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: now(),
      role: "system",
      text: "You can describe a video idea and I will extract options and generate a script.",
    },
  ]);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState({
    duration: "",
    language: "",
    platform: "",
    size: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingMissing, setPendingMissing] = useState([]); // list of fields assistant asked for
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingMissing]);

  const pushMessage = (m) => setMessages((s) => [...s, { ...m, id: now() }]);

  const tryExtract = async (text) => {
    const data = await apiCall("/extract", { prompt: text });
    return {
      duration: data.duration ?? "",
      language: data.language ?? "",
      platform: data.platform ?? "",
      size: data.size ?? "",
      category: data.category ?? "",
    };
  };

  const EXAMPLES = {
    duration: "e.g., 30 seconds",
    language: "e.g., English",
    platform: "e.g., YouTube",
    size: "e.g., Vertical / Landscape / Square",
    category: "e.g., Kids/Education",
  };

  const formatMissingWithExamples = (list) =>
    list.map((k) => (EXAMPLES[k] ? `${k} (${EXAMPLES[k]})` : k)).join(", ");

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    pushMessage({ role: "user", text: trimmed });
    setInput("");
    setError("");

    // If assistant previously asked for missing fields, try to extract answers from this reply
    if (pendingMissing.length > 0) {
      setLoading(true);
      try {
        const extracted = await tryExtract(trimmed);
        const newOptions = { ...options };
        pendingMissing.forEach((k) => {
          if (extracted[k]) newOptions[k] = extracted[k];
        });
        setOptions(newOptions);

        // Check remaining missing
        const stillMissing = pendingMissing.filter((k) => !newOptions[k]);
        if (stillMissing.length > 0) {
          pushMessage({
            role: "assistant",
            text: `Thanks — I still need: ${formatMissingWithExamples(stillMissing)}.`,
          });
          setPendingMissing(stillMissing);
        } else {
          setPendingMissing([]);
          // All options provided — generate script
          await generateScriptFlow(
            newOptions,
            messages.findLast?.((m) => m.role === "user")?.text || trimmed,
          );
        }
      } catch (err) {
        setError(
          err.response?.data?.error || err.message || "Extraction failed",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal flow: try to extract options from user message
    setLoading(true);
    try {
      const extracted = await tryExtract(trimmed);
      const merged = { ...options };
      Object.keys(merged).forEach((k) => {
        if (extracted[k]) merged[k] = extracted[k];
      });
      setOptions(merged);

      // Determine missing fields
      const missing = Object.entries(merged)
        .filter(([k, v]) => !v)
        .map(([k]) => k);
      if (missing.length > 0) {
        setPendingMissing(missing);
        pushMessage({
          role: "assistant",
          text: `I extracted some options but couldn't determine: ${formatMissingWithExamples(missing)}. Could you provide them?`,
        });
      } else {
        // All present — auto generate
        await generateScriptFlow(merged, trimmed);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const generateScriptFlow = async (opts, originalPrompt) => {
    pushMessage({
      role: "assistant",
      text: "All set — generating the script now…",
    });
    setLoading(true);
    try {
      const payload = { prompt: originalPrompt, options: opts };
      const data = await apiCall("/generate-script", payload);
      const scriptText = data.script ?? data.text ?? data.output ?? "";
      if (!scriptText) {
        pushMessage({
          role: "assistant",
          text: "I could not generate a script. Please try again.",
        });
      } else {
        pushMessage({ role: "assistant", text: scriptText });
      }
    } catch (err) {
      pushMessage({
        role: "assistant",
        text: `Error: ${err.response?.data?.error || err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    // allow explicit actions: enhance, generate
    setError("");
    if (!messages.find((m) => m.role === "user")) return;
    const lastUser =
      [...messages].reverse().find((m) => m.role === "user")?.text || "";
    if (action === "enhance") {
      setLoading(true);
      try {
        const data = await apiCall("/enhance", { prompt: lastUser, options });
        const enhanced = data.enhancedPrompt ?? lastUser;
        pushMessage({
          role: "assistant",
          text: `Enhanced prompt: ${enhanced}`,
        });
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Enhance failed");
      } finally {
        setLoading(false);
      }
    }
    if (action === "generate") {
      await generateScriptFlow(options, lastUser);
    }
  };

  return (
    <div className="app chat-app">
      <header className="header">
        <h1>AI Prompt Intelligence</h1>
        <span className="header-badge">Chat Interface</span>
      </header>

      <main className="chat-window">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role}`}>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <form className="chat-input" onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            pendingMissing.length > 0
              ? `Please provide: ${pendingMissing.join(", ")}`
              : "Describe your video idea..."
          }
        />
        <div className="chat-actions">
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Working…" : "Send"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleQuickAction("enhance")}
            disabled={loading}
          >
            Enhance
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => handleQuickAction("generate")}
            disabled={loading}
          >
            Generate
          </button>
        </div>
      </form>

      <section className="flow-hint">
        <strong>Note:</strong> I will try to extract options from your message.
        If something is missing I'll ask follow-up questions.
      </section>
    </div>
  );
}
