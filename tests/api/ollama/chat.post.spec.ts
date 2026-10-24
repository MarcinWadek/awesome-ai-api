import { test } from '../../../fixtures/auth.fixture';
import { expectChatAnswer, expectOllamaJsonError } from '../../../support/assertions/ollama';
import { readChatStream } from '../../../support/ollama.helpers';
import { ollamaScenarios } from '../../../support/ollama-test-data';
test.describe('POST /api/v1/ollama/chat', () => {
  test('200: streams assistant thinking and text from a known conversation', async ({ ollamaClient, authenticatedUser }) => {
    // When
    const response = await ollamaClient.chat(ollamaScenarios.chat, authenticatedUser.token);

    // Then
    const chunks = await readChatStream(response, ollamaScenarios.model);
    expectChatAnswer(chunks, ollamaScenarios.chatText, ollamaScenarios.chatThinking);
  });

  test('400: rejects empty conversation history before streaming', async ({ ollamaClient, authenticatedUser }) => {
    // When
    const response = await ollamaClient.chat({
      ...ollamaScenarios.chat,
      messages: []
    }, authenticatedUser.token);

    // Then
    await expectOllamaJsonError(response, 400, 'messages');
  });

  test('401: rejects missing authentication', async ({ ollamaClient }) => {
    // When
    const response = await ollamaClient.chat(ollamaScenarios.chat);

    // Then
    await expectOllamaJsonError(response, 401, 'message');
  });
});
