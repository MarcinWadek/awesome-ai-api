import { test } from '../../../fixtures/auth.fixture';
import { expectChatAnswer, expectOllamaJsonError } from '../../../support/assertions/ollama';
import { readChatStream } from '../../../support/ollama.helpers';
import { ollamaScenarios } from '../../../support/ollama-test-data';

test.describe('POST /api/v1/ollama/chat', () => {
  test.describe.configure({ retries: 0 });

  test.describe('200', () => {
    test('streams assistant thinking and text from a known conversation', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends the known status-update conversation', () =>
        ollamaClient.chat(ollamaScenarios.chat, authenticatedUser.token),
      );
      const chunks = await test.step('Then the complete response contains valid chat SSE chunks', () =>
        readChatStream(response, ollamaScenarios.model),
      );
      await test.step('Then assistant fragments reconstruct text and thinking before final completion', () => {
        expectChatAnswer(chunks, ollamaScenarios.chatText, ollamaScenarios.chatThinking);
      });
    });
  });

  test.describe('400', () => {
    test('rejects empty conversation history before streaming', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends no messages', () =>
        ollamaClient.chat({ ...ollamaScenarios.chat, messages: [] }, authenticatedUser.token),
      );
      await test.step('Then the response is a JSON messages validation error', () =>
        expectOllamaJsonError(response, 400, 'messages'),
      );
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user sends a valid conversation', () =>
        ollamaClient.chat(ollamaScenarios.chat),
      );
      await test.step('Then the response is a JSON authentication error', () =>
        expectOllamaJsonError(response, 401, 'message'),
      );
    });
  });
});
