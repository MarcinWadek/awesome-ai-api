import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ChatRequest, GenerateRequest } from '../types/ollama';

export class OllamaClient {
  constructor(private readonly request: APIRequestContext) {}

  getToolDefinitions(token?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/ollama/chat/tools/definitions', {
      headers: this.headers(token, false),
    });
  }

  generate(data: Partial<GenerateRequest>, token?: string): Promise<APIResponse> {
    return this.request.post('/api/v1/ollama/generate', {
      data, headers: this.headers(token, true),
    });
  }

  chat(data: Partial<ChatRequest>, token?: string): Promise<APIResponse> {
    return this.request.post('/api/v1/ollama/chat', {
      data, headers: this.headers(token, true),
    });
  }

  chatWithTools(data: Partial<ChatRequest>, token?: string): Promise<APIResponse> {
    return this.request.post('/api/v1/ollama/chat/tools', {
      data, headers: this.headers(token, true),
    });
  }

  private headers(token: string | undefined, streaming: boolean): Record<string, string> {
    return {
      Accept: streaming ? 'text/event-stream, application/json' : 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    };
  }
}
