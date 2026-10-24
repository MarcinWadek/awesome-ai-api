import { test } from '../../../fixtures/auth.fixture';
import { expectGeneratedAnswer, expectOllamaJsonError } from '../../../support/assertions/ollama';
import { readGenerateStream } from '../../../support/ollama.helpers';
import { ollamaScenarios } from '../../../support/ollama-test-data';
test.describe('POST /api/v1/ollama/generate', () => {
  test('200: streams deterministic thinking and response through final completion', async ({ ollamaClient, authenticatedUser }) => {
    // When
    const response = await ollamaClient.generate(ollamaScenarios.generate, authenticatedUser.token);

    // Then
    const chunks = await readGenerateStream(response, ollamaScenarios.model);
    expectGeneratedAnswer(chunks, ollamaScenarios.generateText, ollamaScenarios.generateThinking);
  });

  test('400: rejects a blank prompt before streaming', async ({ ollamaClient, authenticatedUser }) => {
    // When
    const response = await ollamaClient.generate({
      ...ollamaScenarios.generate,
      prompt: ' '
    }, authenticatedUser.token);

    // Then
    await expectOllamaJsonError(response, 400, 'prompt');
  });

  test('401: rejects missing authentication', async ({ ollamaClient }) => {
    // When
    const response = await ollamaClient.generate(ollamaScenarios.generate);

    // Then
    await expectOllamaJsonError(response, 401, 'message');
  });
});
