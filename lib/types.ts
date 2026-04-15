// ---------------------------------------------------------------------------
// Anthropic API response types (Managed Agents beta)
// These mirror the shapes returned by the SDK beta methods.
// ---------------------------------------------------------------------------

export interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  system?: string;
  tools?: AgentTool[];
  mcp_servers?: McpServer[];
  created_at?: string;
  updated_at?: string;
}

export interface AgentTool {
  type: string;
  name?: string;
  [key: string]: unknown;
}

export interface McpServer {
  url: string;
  name?: string;
  [key: string]: unknown;
}

export interface Environment {
  id: string;
  name: string;
  setup_commands?: string[];
  network_access?: boolean;
  created_at?: string;
}

export interface Session {
  id: string;
  agent_id: string;
  environment_id?: string;
  status?: string;
  created_at?: string;
}

export interface Vault {
  id: string;
  name: string;
  metadata?: Record<string, string>;
  created_at?: string;
}

export interface Credential {
  id: string;
  vault_id: string;
  display_name: string;
  auth: CredentialAuth;
  metadata?: Record<string, string>;
  created_at?: string;
}

export interface CredentialAuth {
  type: string;
  token?: string;
  mcp_server_url?: string;
}

// ---------------------------------------------------------------------------
// Local state types (SQLite)
// ---------------------------------------------------------------------------

export interface BoardTask {
  id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "failed";
  agent_id: string | null;
  environment_id: string | null;
  session_id: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  chat_id: string;
  agent_id: string;
  environment_id: string;
  session_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Chat types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

// ---------------------------------------------------------------------------
// SSE event types (streamed from the Anthropic sessions API)
// ---------------------------------------------------------------------------

export interface SSEEvent {
  event: string;
  data: unknown;
}

export interface SessionEvent {
  type: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }>;
  };
  [key: string]: unknown;
}
