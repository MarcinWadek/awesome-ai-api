import { test } from '../../../fixtures/ollama.fixture';
import { expectOllamaJsonError } from '../../../support/assertions/ollama';
import { expectProductToolDefinitions } from '../../../support/assertions/ollama-tools';

test.describe('GET /api/v1/ollama/chat/tools/definitions', () => {
  test.describe.configure({ retries: 0 });

  test.describe('200', () => {
    test('returns usable product tool schemas', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user requests tool definitions', () =>
        ollamaClient.getToolDefinitions(authenticatedUser.token),
      );
      await test.step('Then the response contains function schemas for both product tools', () =>
        expectProductToolDefinitions(response),
      );
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user requests tool definitions', () =>
        ollamaClient.getToolDefinitions(),
      );
      await test.step('Then the response is a JSON authentication error', () =>
        expectOllamaJsonError(response, 401, 'message'),
      );
    });
  });
});
