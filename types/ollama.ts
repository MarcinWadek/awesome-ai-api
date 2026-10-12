export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string; enum?: string[] | null }>;
      required?: string[] | null;
      oneOf?: Array<{ required: string[] }> | null;
    };
  };
}

export interface ToolCall {
  id?: string | null;
  function: { name: string; arguments?: Record<string, unknown> | null };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  thinking?: string | null;
  tool_calls?: ToolCall[] | null;
  tool_name?: string | null;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  think?: boolean;
  options?: Record<string, unknown>;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  stream?: boolean;
  think?: boolean;
  options?: Record<string, unknown>;
}

export interface StreamChunk {
  model?: string | null;
  created_at?: string | null;
  done: boolean;
}

export interface GenerateChunk extends StreamChunk {
  response?: string | null;
  thinking?: string | null;
  context?: number[] | null;
  total_duration?: number | null;
}

export interface ChatChunk extends StreamChunk {
  message?: ChatMessage | null;
}

export interface ProductListToolResult {
  products: Array<{ id: number; name: string }>;
  total: number;
  page: number;
  size: number;
}
