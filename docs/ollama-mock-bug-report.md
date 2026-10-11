# Mock final answer disagrees with product tool results

Observed on **11 October 2026**, `https://awesome.byst.re`.
Evidence: [Ollama exploration](exploration/2026-10-11-ollama.md).

1. Sign in with an isolated client account and fetch Ollama tool definitions.
2. POST `/api/v1/ollama/chat/tools` with model `qwen3.5:2b`, stream=true,
   the fetched tools, and user prompt
   `What iphones do we have available? Tell me the details about them`.
3. Consume the full SSE body, including events after the first done=true.
4. Compare the get_product_snapshot role=tool payload with the final assistant text.

Expected: product advice reflects returned catalogue price and inventory. The
backend tool definition describes real price/stock grounding and warns against
guessing; the tool result is the authoritative catalogue observation.

Actual: tool result reports iPhone 13 Pro price **999.99**, stock **47**. Final
assistant prose says **$999**, stock **5**. The snapshot matches GET products.

Source explanation: mock `chat-scenarios.json` stores the final prose as a fixed
string; ChatToolsService selects the stage by tool name and does not derive
facts from tool content. This limits mock grounding tests; it does not indicate
incorrect backend tool execution or prove a real model has the same issue.

Tests validate tool payload structure and product identity against catalogue
reads. Exact price/stock equality requires isolated data because those values
can change between requests. Final mock prose is asserted separately as a
transport expectation; it does not establish catalogue grounding. A future mock
fix could derive final facts from tool results. No backend/mock code changed.
