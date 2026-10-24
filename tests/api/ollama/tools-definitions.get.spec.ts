import { test } from '../../../fixtures/auth.fixture';
import { expectOllamaJsonError } from '../../../support/assertions/ollama';
import { expectProductToolDefinitions } from '../../../support/assertions/ollama-tools';
test.describe('GET /api/v1/ollama/chat/tools/definitions', () => {
  test('200: returns usable product tool schemas', async ({ ollamaClient, authenticatedUser }) => {
    // When
    const response = await ollamaClient.getToolDefinitions(authenticatedUser.token);

    // Then
    await expectProductToolDefinitions(response);
  });

  test('401: rejects missing authentication', async ({ ollamaClient }) => {
    // When
    const response = await ollamaClient.getToolDefinitions();

    // Then
    await expectOllamaJsonError(response, 401, 'message');
  });
});
