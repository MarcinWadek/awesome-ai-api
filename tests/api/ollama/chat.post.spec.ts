import { expect, test } from '../../../fixtures/ollama.fixture';
import { ollamaScenarios } from '../../../support/ollama-test-data';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { assistantText, expectChatChunks, expectCompletedPhase, expectCompletedStream, expectSseResponse, expectThinkingBeforeContent } from '../../../support/assertions/ollama';
import { readSseJson } from '../../../support/sse';
import type { ApiErrorResponse } from '../../../types/auth';
import type { ChatChunk } from '../../../types/ollama';

test.describe('POST /api/v1/ollama/chat', () => {
  test.describe.configure({ retries: 0 });

  test.describe('200', () => {
    test('streams assistant thinking and text from a known conversation', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends the known status-update conversation', () =>
        ollamaClient.chat(ollamaScenarios.chat, authenticatedUser.token),
      );
      const chunks = await test.step('Then the complete response contains valid chat SSE chunks', async () => {
        expectSseResponse(response);
        const events = await readSseJson<ChatChunk>(response);
        expectCompletedStream(events, ollamaScenarios.model);
        expectChatChunks(events);
        return events;
      });
      await test.step('Then assistant fragments reconstruct text and thinking before final completion', async () => {
        expect(chunks.filter(chunk => chunk.message?.content != null).length).toBeGreaterThan(1);
        expect(chunks.filter(chunk => chunk.message != null).every(chunk => chunk.message?.role === 'assistant')).toBe(true);
        expect(assistantText(chunks)).toBe(ollamaScenarios.chatText);
        expect(chunks.map(chunk => chunk.message?.thinking ?? '').join('')).toBe(ollamaScenarios.chatThinking);
        expectCompletedPhase(chunks);
        expectThinkingBeforeContent(chunks.map(chunk => ({
          thinking: chunk.message?.thinking, content: chunk.message?.content,
        })));
      });
    });
  });

  test.describe('400', () => {
    test('rejects empty conversation history before streaming', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends no messages', () =>
        ollamaClient.chat({ ...ollamaScenarios.chat, messages: [] }, authenticatedUser.token),
      );
      await test.step('Then the response is a JSON messages validation error', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json() as Record<string, unknown>).messages);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user sends a valid conversation', () =>
        ollamaClient.chat(ollamaScenarios.chat),
      );
      await test.step('Then the response is a JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json() as ApiErrorResponse).message);
      });
    });
  });
});
