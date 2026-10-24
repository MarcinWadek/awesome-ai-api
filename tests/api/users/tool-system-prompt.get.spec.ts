import type { ApiErrorResponse } from '../../../types/auth';
import { test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import type { ToolSystemPrompt } from '../../../types/prompts';
test.describe('GET /api/v1/users/tool-system-prompt', () => {
  test('200: returns the new user’s effective default prompt', async ({ authenticatedUser, usersClient }) => {
    // When
    const response = await usersClient.getToolSystemPrompt(authenticatedUser.token);

    // Then
    const body = await json<ToolSystemPrompt>(response);
    expectNonEmptyString(body.toolSystemPrompt);
  });

  test('401: rejects a request without authentication', async ({ usersClient }) => {
    // When
    const response = await usersClient.getToolSystemPrompt();

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
  });
});
