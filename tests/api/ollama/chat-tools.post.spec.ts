import { ProductsClient } from '../../../clients/products.client';
import { test } from '../../../fixtures/ollama.fixture';
import { expectOllamaJsonError } from '../../../support/assertions/ollama';
import { expectProductToolFlow, expectProductToolResults } from '../../../support/assertions/ollama-tools';
import { getProductToolContext, readChatStream } from '../../../support/ollama.helpers';
import { listProductsToolDefinition, ollamaScenarios } from '../../../support/ollama-test-data';

test.describe('POST /api/v1/ollama/chat/tools', () => {
  test.describe.configure({ retries: 0 });
  let productsClient: ProductsClient;

  test.beforeEach(({ request }) => {
    productsClient = new ProductsClient(request);
  });

  test.describe('200', () => {
    test('executes both product tools and completes after intermediate done events', async ({ ollamaClient, authenticatedUser }) => {
      const { tools, catalogue } = await test.step('Given available tool schemas and current catalogue data', () =>
        getProductToolContext(ollamaClient, productsClient, authenticatedUser.token),
      );
      const response = await test.step('When the user requests the known product tool scenario', () =>
        ollamaClient.chatWithTools({ ...ollamaScenarios.tools, tools }, authenticatedUser.token),
      );
      const chunks = await test.step('Then the entire SSE response is collected through EOF', () =>
        readChatStream(response, ollamaScenarios.model),
      );
      await test.step('Then both calls execute in order despite intervening completion markers', () => {
        expectProductToolFlow(chunks, ollamaScenarios.toolsText);
      });
      await test.step('Then tool payloads have valid data and refer to catalogue products', () => {
        expectProductToolResults(chunks, catalogue);
      });
    });
  });

  test.describe('400', () => {
    test('rejects missing tool definitions before streaming', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends an empty tool list', () =>
        ollamaClient.chatWithTools({ ...ollamaScenarios.tools, tools: [] }, authenticatedUser.token),
      );
      await test.step('Then the response explains the missing tool definitions', () =>
        expectOllamaJsonError(response, 400, 'error', 'At least one tool definition is required'),
      );
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user sends a valid tool-enabled conversation', () =>
        ollamaClient.chatWithTools({ ...ollamaScenarios.tools, tools: [listProductsToolDefinition] }),
      );
      await test.step('Then the response is a JSON authentication error', () =>
        expectOllamaJsonError(response, 401, 'message'),
      );
    });
  });
});
