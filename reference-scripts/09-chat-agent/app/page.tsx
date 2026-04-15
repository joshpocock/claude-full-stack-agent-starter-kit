"use client";

/**
 * Chat UI - Client Component
 *
 * A clean, minimal chat interface that talks to our Next.js API route.
 * Dark theme with Stride brand colors: gold (#BA9926) for user bubbles,
 * dark gray (#1A1A1A) for agent bubbles.
 *
 * State is managed entirely on the client. The chat_id is stored in
 * localStorage so conversations persist across page refreshes.
 *
 * This replaces n8n's 10-node workflow with a single Next.js app.
 * No visual workflow builder needed -- just React and the Anthropic SDK.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---

interface Message {
  role: "user" | "agent" | "error";
  text: string;
}

// --- Helpers ---

/** Get or create a persistent chat ID stored in localStorage */
function getChatId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("chat_id");
  if (!id) {
    id =
      "chat-" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36);
    localStorage.setItem("chat_id", id);
  }
  return id;
}

// --- Component ---

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [chatId, setChatId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize chat ID from localStorage on mount
  useEffect(() => {
    setChatId(getChatId());
  }, []);

  // Auto-scroll to the latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWaiting]);

  // Send a message to the API route and append the response
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isWaiting || !chatId) return;

    // Add the user's message to the chat
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsWaiting(true);

    try {
      // POST to the Next.js API route
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message: text }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "agent", text: data.response }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "error", text: data.error || "Unknown error" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: "Could not reach the server. Is it running?" },
      ]);
    }

    setIsWaiting(false);
    inputRef.current?.focus();
  }, [input, isWaiting, chatId]);

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Chat Agent</h1>
        <span style={styles.badge}>claude-sonnet-4-6</span>
      </div>

      {/* Messages area */}
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              ...(msg.role === "user"
                ? styles.userMessage
                : msg.role === "error"
                ? styles.errorMessage
                : styles.agentMessage),
            }}
          >
            {msg.text}
          </div>
        ))}

        {/* Thinking indicator while waiting for Claude */}
        {isWaiting && (
          <div style={{ ...styles.message, ...styles.thinkingMessage }}>
            Thinking...
          </div>
        )}

        {/* Invisible div to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isWaiting}
          style={styles.input}
          autoFocus
        />
        <button
          onClick={sendMessage}
          disabled={isWaiting || !input.trim()}
          style={{
            ...styles.button,
            opacity: isWaiting || !input.trim() ? 0.4 : 1,
            cursor: isWaiting || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// --- Styles ---
// Inline styles keep the demo self-contained. No Tailwind or CSS modules needed.

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #222",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#BA9926",
    margin: 0,
  },
  badge: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "10px",
    background: "#1a1a1a",
    color: "#888",
    border: "1px solid #333",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  message: {
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: "12px",
    lineHeight: 1.5,
    fontSize: "14px",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
  userMessage: {
    alignSelf: "flex-end",
    background: "#BA9926",
    color: "#000",
    borderBottomRightRadius: "4px",
  },
  agentMessage: {
    alignSelf: "flex-start",
    background: "#1a1a1a",
    color: "#e0e0e0",
    border: "1px solid #2a2a2a",
    borderBottomLeftRadius: "4px",
  },
  thinkingMessage: {
    alignSelf: "flex-start",
    background: "#1a1a1a",
    color: "#888",
    border: "1px solid #2a2a2a",
    borderBottomLeftRadius: "4px",
    fontStyle: "italic",
  },
  errorMessage: {
    alignSelf: "center",
    background: "#2a1010",
    color: "#ff6b6b",
    border: "1px solid #4a2020",
    fontSize: "13px",
  },
  inputArea: {
    padding: "16px 24px",
    borderTop: "1px solid #222",
    display: "flex",
    gap: "12px",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#141414",
    color: "#e0e0e0",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  button: {
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    background: "#BA9926",
    color: "#000",
    fontSize: "14px",
    fontWeight: 600,
  },
};
