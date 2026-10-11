import { expect, test } from '../../../fixtures/ollama.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { ApiErrorResponse } from '../../../types/auth';
import type { ToolDefinition } from '../../../types/ollama';

test.describe('GET /api/v1/ollama/chat/tools/definitions', () => {
  test.describe.configure({ retries: 0 });

  test.describe('200', () => {
    test('returns usable product tool schemas', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user requests tool definitions', () =>
        ollamaClient.getToolDefinitions(authenticatedUser.token),
      );

      await test.step('Then the response contains function schemas for both product tools', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const tools = await response.json() as ToolDefinition[];
        expect(Array.isArray(tools)).toBe(true);
        const names = tools.map(tool => tool.function.name);
        expect(names).toEqual(expect.arrayContaining(['get_product_snapshot', 'list_products']));
        expect(new Set(names).size).toBe(names.length);
        for (const tool of tools) {
          expect(tool.type).toBe('function');
          expectNonEmptyString(tool.function.name);
          expectNonEmptyString(tool.function.description);
          expect(tool.function.parameters.type).toBe('object');
          expect(Object.keys(tool.function.parameters.properties).length).toBeGreaterThan(0);
          for (const property of Object.values(tool.function.parameters.properties)) {
            expectNonEmptyString(property.type);
          }
        }
        const snapshot = tools.find(tool => tool.function.name === 'get_product_snapshot')!;
        expect(snapshot.function.parameters.properties).toMatchObject({
          productId: { type: 'integer' }, name: { type: 'string' },
        });
        expect(snapshot.function.parameters.oneOf).toEqual(expect.arrayContaining([
          { required: ['productId'] }, { required: ['name'] },
        ]));
        const list = tools.find(tool => tool.function.name === 'list_products')!;
        expect(list.function.parameters.properties).toMatchObject({
          offset: { type: 'integer' }, limit: { type: 'integer' },
          category: { type: 'string' }, inStockOnly: { type: 'boolean' },
        });
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user requests tool definitions', () =>
        ollamaClient.getToolDefinitions(),
      );
      await test.step('Then the response is a JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json() as ApiErrorResponse).message);
      });
    });
  });
});
