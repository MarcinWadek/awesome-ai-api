import { test } from '../../../fixtures/auth.fixture';
import { expectOllamaJsonError } from '../../../support/assertions/ollama';
import { expectProductToolFlow, expectProductToolResults } from '../../../support/assertions/ollama-tools';
import { getProductToolContext, readChatStream } from '../../../support/ollama.helpers';
import { listProductsToolDefinition, ollamaScenarios } from '../../../data/ollama';
test.describe('POST /api/v1/ollama/chat/tools', () => {
  test('200: executes both product tools and completes after intermediate done events', async ({ ollamaClient, authenticatedUser, productsClient }) => {
    // Given
    const { tools, catalogue } = await getProductToolContext(ollamaClient, productsClient, authenticatedUser.token);

    // When
    const response = await ollamaClient.chatWithTools({
      ...ollamaScenarios.tools,
      tools
    }, authenticatedUser.token);

    // Then
    const chunks = await readChatStream(response, ollamaScenarios.model);
    expectProductToolFlow(chunks, ollamaScenarios.toolsText);
    expectProductToolResults(chunks, catalogue);
  });

  test('400: rejects missing tool definitions before streaming', async ({ ollamaClient, authenticatedUser }) => {
    // When
    const response = await ollamaClient.chatWithTools({
      ...ollamaScenarios.tools,
      tools: []
    }, authenticatedUser.token);

    // Then
    await expectOllamaJsonError(response, 400, 'error', 'At least one tool definition is required');
  });

  test('401: rejects missing authentication', async ({ ollamaClient }) => {
    // When
    const response = await ollamaClient.chatWithTools({
      ...ollamaScenarios.tools,
      tools: [listProductsToolDefinition]
    });

    // Then
    await expectOllamaJsonError(response, 401, 'message');
  });
});
