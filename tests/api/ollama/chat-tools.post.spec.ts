import { ProductsClient } from '../../../clients/products.client';
import { expect, test } from '../../../fixtures/ollama.fixture';
import { ollamaScenarios } from '../../../support/ollama-test-data';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { assistantText, expectChatChunks, expectCompletedPhase, expectCompletedStream, expectSseResponse } from '../../../support/assertions/ollama';
import { expectProduct } from '../../../support/assertions/products';
import { readSseJson } from '../../../support/sse';
import type { ApiErrorResponse } from '../../../types/auth';
import type { ChatChunk, ProductListToolResult, ToolDefinition } from '../../../types/ollama';
import type { ProductResponse } from '../../../types/products';

test.describe('POST /api/v1/ollama/chat/tools', () => {
  test.describe.configure({ retries: 0 });
  let productsClient: ProductsClient;

  test.beforeEach(({ request }) => {
    productsClient = new ProductsClient(request);
  });

  test.describe('200', () => {
    test('executes both product tools and completes after intermediate done events', async ({ ollamaClient, authenticatedUser }) => {
      const { tools, catalogue } = await test.step('Given available tool schemas and current catalogue data', async () => {
        const [definitions, products] = await Promise.all([
          ollamaClient.getToolDefinitions(authenticatedUser.token),
          productsClient.getProducts(authenticatedUser.token),
        ]);
        expect(definitions.status()).toBe(200);
        expectJsonResponse(definitions);
        expect(products.status()).toBe(200);
        expectJsonResponse(products);
        const tools = await definitions.json() as ToolDefinition[];
        const catalogue = await products.json() as ProductResponse[];
        expect(Array.isArray(tools)).toBe(true);
        expect(Array.isArray(catalogue)).toBe(true);
        expect(catalogue.find(product => product.id === 1), 'The verified mock snapshot scenario requires product 1').toBeDefined();
        return { tools, catalogue };
      });

      const response = await test.step('When the user requests the known product tool scenario', () =>
        ollamaClient.chatWithTools({ ...ollamaScenarios.tools, tools }, authenticatedUser.token),
      );
      const chunks = await test.step('Then the entire SSE response is collected through EOF', async () => {
        expectSseResponse(response);
        const events = await readSseJson<ChatChunk>(response);
        expectCompletedStream(events, ollamaScenarios.model);
        expectChatChunks(events);
        return events;
      });

      await test.step('Then both calls execute in order despite intervening completion markers', async () => {
        const calls = chunks.flatMap(chunk => chunk.message?.tool_calls ?? []);
        expect(calls.map(call => call.function.name)).toEqual(['list_products', 'get_product_snapshot']);
        expect(calls[0].function.arguments).toEqual({ category: 'electronics', inStockOnly: true, limit: 25 });
        expect(calls[1].function.arguments).toEqual({ productId: 1 });
        const results = chunks.filter(chunk => chunk.message?.role === 'tool');
        expect(results.map(chunk => chunk.message?.tool_name)).toEqual(['list_products', 'get_product_snapshot']);
        for (const result of results) expect(result.done).toBe(false);
        const firstCall = chunks.findIndex(chunk => chunk.message?.tool_calls?.[0]?.function.name === 'list_products');
        const firstResult = chunks.indexOf(results[0]);
        const secondCall = chunks.findIndex(chunk => chunk.message?.tool_calls?.[0]?.function.name === 'get_product_snapshot');
        const secondResult = chunks.indexOf(results[1]);
        expect(firstResult).toBeGreaterThan(firstCall);
        expect(secondCall).toBeGreaterThan(firstResult);
        expect(secondResult).toBeGreaterThan(secondCall);
        expectCompletedPhase(chunks.slice(0, firstResult));
        expectCompletedPhase(chunks.slice(firstResult + 1, secondResult));
        const finalPhase = chunks.slice(secondResult + 1);
        expectCompletedPhase(finalPhase);
        expect(finalPhase.filter(chunk => chunk.message != null)
          .every(chunk => chunk.message?.role === 'assistant')).toBe(true);
        expect(assistantText(finalPhase)).toBe(ollamaScenarios.toolsText);
      });

      await test.step('Then tool payloads have valid data and refer to catalogue products', async () => {
        const listMessage = chunks.find(chunk => chunk.message?.role === 'tool' && chunk.message.tool_name === 'list_products')!.message!;
        expectNonEmptyString(listMessage.content);
        const list = JSON.parse(listMessage.content) as ProductListToolResult;
        expect(list).toMatchObject({ page: 0, size: 25 });
        expect(Array.isArray(list.products)).toBe(true);
        expect(Number.isInteger(list.total)).toBe(true);
        expect(list.total).toBeGreaterThanOrEqual(0);
        expect(list.products).toHaveLength(Math.min(25, list.total));
        expect(new Set(list.products.map(product => product.id)).size).toBe(list.products.length);
        for (const product of list.products) {
          const actual = catalogue.find(candidate => candidate.id === product.id);
          expect(actual).toBeDefined();
          expect(actual!.category.toLowerCase()).toBe('electronics');
          expect(product).toEqual({ id: actual!.id, name: actual!.name });
        }
        const snapshotMessage = chunks.find(chunk => chunk.message?.role === 'tool' && chunk.message.tool_name === 'get_product_snapshot')!.message!;
        expectNonEmptyString(snapshotMessage.content);
        const snapshot = JSON.parse(snapshotMessage.content) as ProductResponse;
        expectProduct(snapshot);
        const actual = catalogue.find(product => product.id === 1)!;
        expect(snapshot).toMatchObject({ id: actual.id, name: actual.name, category: actual.category });
        // Price, stock, availability totals and timestamps may change between reads.
      });
    });
  });

  test.describe('400', () => {
    test('rejects missing tool definitions before streaming', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends an empty tool list', () =>
        ollamaClient.chatWithTools({ ...ollamaScenarios.tools, tools: [] }, authenticatedUser.token),
      );
      await test.step('Then the response explains the missing tool definitions', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        expect((await response.json() as { error: string }).error).toBe('At least one tool definition is required');
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user sends a valid tool-enabled conversation', () =>
        ollamaClient.chatWithTools({
          ...ollamaScenarios.tools,
          tools: [{ type: 'function', function: {
            name: 'list_products',
            parameters: { type: 'object', properties: { category: { type: 'string' } } },
          } }],
        }),
      );
      await test.step('Then the response is a JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json() as ApiErrorResponse).message);
      });
    });
  });
});
