import { test } from '../../../fixtures/ollama.fixture';
import { expectGeneratedAnswer, expectOllamaJsonError } from '../../../support/assertions/ollama';
import { readGenerateStream } from '../../../support/ollama.helpers';
import { ollamaScenarios } from '../../../support/ollama-test-data';

test.describe('POST /api/v1/ollama/generate', () => {
  test.describe.configure({ retries: 0 });

  test.describe('200', () => {
    test('streams deterministic thinking and response through final completion', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user generates the known release-plan scenario', () =>
        ollamaClient.generate(ollamaScenarios.generate, authenticatedUser.token),
      );
      const chunks = await test.step('Then the complete response contains valid SSE JSON chunks', () =>
        readGenerateStream(response, ollamaScenarios.model),
      );
      await test.step('Then text and thinking reconstruct exactly and completion follows the fragments', () => {
        expectGeneratedAnswer(chunks, ollamaScenarios.generateText, ollamaScenarios.generateThinking);
      });
    });
  });

  test.describe('400', () => {
    test('rejects a blank prompt before streaming', async ({ ollamaClient, authenticatedUser }) => {
      const response = await test.step('When the authenticated user sends a blank prompt', () =>
        ollamaClient.generate({ ...ollamaScenarios.generate, prompt: ' ' }, authenticatedUser.token),
      );
      await test.step('Then the response is a JSON prompt validation error', () =>
        expectOllamaJsonError(response, 400, 'prompt'),
      );
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async ({ ollamaClient }) => {
      const response = await test.step('When an anonymous user sends a valid generation request', () =>
        ollamaClient.generate(ollamaScenarios.generate),
      );
      await test.step('Then the response is a JSON authentication error', () =>
        expectOllamaJsonError(response, 401, 'message'),
      );
    });
  });
});
