"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#111",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  color: "#fff",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#a0a0a0",
  marginBottom: 6,
};

export default function NewEnvironmentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [setupCommands, setSetupCommands] = useState("");
  const [networkAccess, setNetworkAccess] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const commands = setupCommands
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          setup_commands: commands.length > 0 ? commands : undefined,
          network_access: networkAccess,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        alert(`Failed to create environment: ${err}`);
        return;
      }

      router.push("/environments");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Create Environment
      </h1>
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div>
            <label style={labelStyle}>
              Name <span style={{ color: "#ba9926" }}>*</span>
            </label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Python Data Science"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <input
              style={inputStyle}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this environment for?"
            />
          </div>

          <div>
            <label style={labelStyle}>Setup Commands</label>
            <textarea
              style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
              value={setupCommands}
              onChange={(e) => setSetupCommands(e.target.value)}
              placeholder={"pip install pandas numpy\nnpm install typescript\napt-get install -y curl"}
            />
            <p style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
              One command per line. These run when the environment starts.
            </p>
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              <div
                onClick={() => setNetworkAccess(!networkAccess)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: networkAccess ? "#ba9926" : "#333",
                  position: "relative",
                  transition: "background 0.2s ease",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: networkAccess ? 23 : 3,
                    transition: "left 0.2s ease",
                  }}
                />
              </div>
              <span>
                Network Access{" "}
                <span style={{ color: "#666" }}>
                  ({networkAccess ? "enabled" : "disabled"})
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            style={{
              background: submitting ? "#7a6518" : "#ba9926",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
              opacity: submitting || !name.trim() ? 0.6 : 1,
              alignSelf: "flex-start",
            }}
          >
            {submitting ? "Creating..." : "Create Environment"}
          </button>
        </form>
      </div>
    </div>
  );
}
