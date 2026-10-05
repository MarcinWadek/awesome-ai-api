import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { ChatSystemPrompt } from '../../../types/prompts';

test.describe('GET /api/v1/users/chat-system-prompt', () => {
  test.describe.configure({ retries: 0 });
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  test.describe('200', () => {
    test('returns the new user’s effective default prompt', async ({ authenticatedUser }) => {
      const response = await test.step('When reading the current user’s chat prompt', () =>
        usersClient.getChatSystemPrompt(authenticatedUser.token),
      );
      await test.step('Then verify the 200 JSON response and default prompt string', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as ChatSystemPrompt;
        expectNonEmptyString(body.chatSystemPrompt);
      });
    });
  });

  test.describe('401', () => {
    test('rejects a request without authentication', async () => {
      const response = await test.step('When reading the chat prompt without Authorization', () =>
        usersClient.getChatSystemPrompt(),
      );
      await test.step('Then verify the 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
    });
  });
});

