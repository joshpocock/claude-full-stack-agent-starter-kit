"use client";

import { useRouter } from "next/navigation";
import AgentEditor, { type AgentConfig } from "@/components/AgentEditor";

export default function NewAgentPage() {
  const router = useRouter();

  const handleSubmit = async (config: AgentConfig) => {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const err = await res.text();
      alert(`Failed to create agent: ${err}`);
      return;
    }

    router.push("/agents");
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="card">
        <AgentEditor onSubmit={handleSubmit} submitLabel="Create Agent" />
      </div>
    </div>
  );
}
