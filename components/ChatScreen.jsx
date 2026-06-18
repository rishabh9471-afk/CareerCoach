import { useState, useRef, useEffect } from "react";
import PathCards from "./PathCards";
import styles from "./ChatScreen.module.css";

const MAX_PATH_ROUNDS = 2;

function parseAIContent(text) {
  const jsonMatch = text.match(/<<<PATHS_JSON>>>([\s\S]*?)<<<END_PATHS_JSON>>>/);
  if (!jsonMatch) return { type: "text", content: text };

  const before = text.slice(0, text.indexOf("<<<PATHS_JSON>>>")).trim();
  const after = text.slice(text.indexOf("<<<END_PATHS_JSON>>>") + "<<<END_PATHS_JSON>>>".length).trim();

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    return { type: "paths", before, after, data: parsed };
  } catch {
    return { type: "text", content: text };
  }
}

export default function ChatScreen({ firstMessage, fileName, onRestart }) {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", raw: firstMessage, parsed: parseAIContent(firstMessage) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [pathRounds, setPathRounds] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [pathChosenFor, setPathChosenFor] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Count path rounds shown so far
  useEffect(() => {
    let count = messages.filter(
      (m) => m.role === "assistant" && m.parsed?.type === "paths"
    ).length;
    setPathRounds(count);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build history for API (strip path cards raw JSON for cleanliness)
  function buildHistory() {
    return messages.map((m) => ({
      role: m.role,
      content: m.raw,
    }));
  }

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading || sessionEnded) return;
    setInput("");

    const userMsg = { id: Date.now(), role: "user", raw: userText, parsed: { type: "text", content: userText } };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = buildHistory();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: userText }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      const assistantId = Date.now() + 1;

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", raw: "", parsed: { type: "text", content: "" }, streaming: true },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, raw: accumulated, parsed: { type: "text", content: accumulated } }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }

      // Final parse of complete message
      const finalParsed = parseAIContent(accumulated);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, raw: accumulated, parsed: finalParsed, streaming: false }
            : m
        )
      );

      // If this was an action plan (user chose a path), end session
      if (pathChosenFor && finalParsed.type === "text") {
        setSessionEnded(true);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          raw: "Sorry, something went wrong. Please try again.",
          parsed: { type: "error", content: err.message },
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleRegenerate() {
    setRegenLoading(true);
    const regenMsg = "These paths don't resonate with me. Please give me 3 entirely different career paths — different roles, different functions, different angles on my background.";
    const userMsg = { id: Date.now(), role: "user", raw: regenMsg, parsed: { type: "text", content: regenMsg } };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = buildHistory();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: regenMsg }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      const assistantId = Date.now() + 1;

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", raw: "", parsed: { type: "text", content: "" }, streaming: true },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const p = JSON.parse(data);
              if (p.text) {
                accumulated += p.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, raw: accumulated, parsed: { type: "text", content: accumulated } }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }

      const finalParsed = parseAIContent(accumulated);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, raw: accumulated, parsed: finalParsed, streaming: false } : m
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRegenLoading(false);
    }
  }

  async function handleChoosePath(pathTitle) {
    setPathChosenFor(pathTitle);
    const msg = `I'd like to pursue the "${pathTitle}" path. What should I do in the next 30 days?`;
    await sendMessage(msg);
  }

  function renderMessage(msg) {
    const { parsed, streaming } = msg;

    if (parsed.type === "paths") {
      const msgPathRound = messages
        .filter((m) => m.role === "assistant" && m.parsed?.type === "paths")
        .findIndex((m) => m.id === msg.id) + 1;

      return (
        <div key={msg.id} className={styles.aiRow}>
          <div className={styles.avatar}>C</div>
          <div className={styles.aiContent}>
            {parsed.before && <div className={styles.bubble}><p>{parsed.before}</p></div>}
            <PathCards
              data={parsed.data}
              round={msgPathRound}
              onChoose={handleChoosePath}
              onRegenerate={handleRegenerate}
              canRegenerate={pathRounds < MAX_PATH_ROUNDS}
              regenLoading={regenLoading}
            />
            {parsed.after && <div className={styles.bubble}><p>{parsed.after}</p></div>}
          </div>
        </div>
      );
    }

    if (msg.role === "user") {
      return (
        <div key={msg.id} className={styles.userRow}>
          <div className={styles.userBubble}><p>{parsed.content}</p></div>
          <div className={styles.userAvatar}>You</div>
        </div>
      );
    }

    // AI text message
    return (
      <div key={msg.id} className={styles.aiRow}>
        <div className={styles.avatar}>C</div>
        <div className={styles.bubble}>
          <p>
            {parsed.content}
            {streaming && <span className={styles.cursor} />}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerDot} />
          <span className={styles.headerName}>Career Coach</span>
          <span className={styles.headerBadge}>AI · Gemini</span>
          {fileName && <span className={styles.headerFile}>📄 {fileName}</span>}
        </div>
        <button className={styles.restartBtn} onClick={onRestart}>
          ↩ Start over
        </button>
      </header>

      <div className={styles.messages}>
        {messages.map((m) => renderMessage(m))}

        {loading && !messages.find((m) => m.streaming) && (
          <div className={styles.aiRow}>
            <div className={styles.avatar}>C</div>
            <div className={styles.bubble}>
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        {sessionEnded && (
          <div className={styles.sessionEnd}>
            <div className={styles.sessionEndInner}>
              <p className={styles.sessionEndTitle}>That&apos;s a wrap on this session.</p>
              <p className={styles.sessionEndText}>
                You have your direction and your first steps. Take action, then come back when you&apos;re ready for the next level.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder={sessionEnded ? "Session complete — start over to begin again" : "Reply to your coach…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          disabled={loading || sessionEnded}
        />
        <button
          className={styles.sendBtn}
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading || sessionEnded}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
