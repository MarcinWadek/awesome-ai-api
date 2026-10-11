import { expect, test } from '../../../fixtures/ollama.fixture';
import { ollamaScenarios } from '../../../support/ollama-test-data';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectCompletedPhase, expectCompletedStream, expectGenerateChunks, expectSseResponse, expectThinkingBeforeContent } from '../../../support/assertions/ollama';
import { readSseJson } from '../../../support/sse';
import type { ApiErrorResponse } from '../../../types/auth';
import type { GenerateChunk } from '../../../types/ollama';

test.describe('POST /api/v1/ollama/generate', () => {
  test.describe.configure({ retries: 0 });

  test.describe('200', () => {
    test('streams deterministic thinking and response through final completion', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user generates the known release-plan scenario', () =>
        ollamaClient.generate(ollamaScenarios.generate, authenticatedUser.token),
      );
      const chunks = await test.step('Then the complete response contains valid SSE JSON chunks', async () => {
        expectSseResponse(response);
        const events = await readSseJson<GenerateChunk>(response);
        expectCompletedStream(events, ollamaScenarios.model);
        expectGenerateChunks(events);
        return events;
      });
      await test.step('Then text and thinking reconstruct exactly and completion follows the fragments', async () => {
        const content = chunks.filter(chunk => chunk.response != null);
        expect(content.length).toBeGreaterThan(1);
        expect(content.map(chunk => chunk.response).join('')).toBe(ollamaScenarios.generateText);
        expect(chunks.map(chunk => chunk.thinking ?? '').join('')).toBe(ollamaScenarios.generateThinking);
        expectCompletedPhase(chunks);
        expectThinkingBeforeContent(chunks.map(chunk => ({
          thinking: chunk.thinking, content: chunk.response,
        })));
      });
    });
  });

  test.describe('400', () => {
    test('rejects a blank prompt before streaming', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends a blank prompt', () =>
        ollamaClient.generate({ ...ollamaScenarios.generate, prompt: ' ' }, authenticatedUser.token),
      );
      await test.step('Then the response is a JSON prompt validation error', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json() as Record<string, unknown>).prompt);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user sends a valid generation request', () =>
        ollamaClient.generate(ollamaScenarios.generate),
      );
      await test.step('Then the response is a JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json() as ApiErrorResponse).message);
      });
    });
  });
});
