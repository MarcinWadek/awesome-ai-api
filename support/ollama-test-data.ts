import type { ChatRequest, GenerateRequest, ToolDefinition } from '../types/ollama';

export const listProductsToolDefinition = {
  type: 'function',
  function: {
    name: 'list_products',
    parameters: { type: 'object', properties: { category: { type: 'string' } } },
  },
} satisfies ToolDefinition;

// Expected prose belongs to these deterministic mock scenarios, not to a real-model contract.
const model = 'qwen3.5:2b';

export const ollamaScenarios = {
  model,
  generate: {
    model, prompt: 'Summarize the release plan', think: true,
  } satisfies GenerateRequest,
  generateText: 'Release plan: qwen3.5:2b is the default mock model, frontend hooks can stay untouched, and integration smoke test is scheduled after Phase 4. Ping me if you need more depth.',
  generateThinking: 'Reviewing the qwen3.5:2b release checklist before drafting the summary...',
  chat: {
    model,
    messages: [{ role: 'user', content: 'Give me a quick status update on the Ollama mock' }],
    stream: true, think: true,
  } satisfies ChatRequest,
  chatText: 'The Ollama mock is up on port 11434, defaults to qwen3.5:2b, and streams deterministic responses so backend/frontend teams can skip the heavy container during the local profile.',
  chatThinking: 'Reviewing the latest notes about the local mock server and its qwen3.5:2b default...',
  tools: {
    model,
    messages: [{ role: 'user', content: 'What iphones do we have available? Tell me the details about them' }],
    stream: true,
  } satisfies ChatRequest,
  // Transport expectation only; catalogue facts must be checked in tool payloads.
  toolsText: 'According to the catalog we currently have on the qwen3.5:2b default path: iPhone 13 Pro and Samsung Galaxy S21. Snapshot for iPhone 13 Pro: priced at $999 with 5 unit(s) in stock.',
};
