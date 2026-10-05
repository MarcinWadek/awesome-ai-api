import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { ToolSystemPrompt } from '../../../types/prompts';

test.describe('GET /api/v1/users/tool-system-prompt', () => {
  test.describe.configure({ retries: 0 });
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  test.describe('200', () => {
    test('returns the new user’s effective default prompt', async ({ authenticatedUser }) => {
      const response = await test.step('When reading the current user’s tool prompt', () =>
        usersClient.getToolSystemPrompt(authenticatedUser.token),
      );
      await test.step('Then verify the 200 JSON response and default prompt string', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as ToolSystemPrompt;
        expectNonEmptyString(body.toolSystemPrompt);
      });
    });
  });

  test.describe('401', () => {
    test('rejects a request without authentication', async () => {
      const response = await test.step('When reading the tool prompt without Authorization', () =>
        usersClient.getToolSystemPrompt(),
      );
      await test.step('Then verify the 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });
});

