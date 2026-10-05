import { UsersClient } from '../../../clients/users.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { ChatSystemPrompt, ToolSystemPrompt } from '../../../types/prompts';

test.describe('PUT /api/v1/users/chat-system-prompt', () => {
  test.describe.configure({ retries: 0 });
  let usersClient: UsersClient;

  test.beforeEach(({ request }) => {
    usersClient = new UsersClient(request);
  });

  async function readPrompt(token: string): Promise<string> {
    const response = await usersClient.getChatSystemPrompt(token);
    expect(response.status()).toBe(200);
    expectJsonResponse(response);
    const body = (await response.json()) as ChatSystemPrompt;
    expectNonEmptyString(body.chatSystemPrompt);
    return body.chatSystemPrompt;
  }

  async function setPrompt(token: string, value: string | null): Promise<void> {
    const response = await usersClient.updateChatSystemPrompt({ chatSystemPrompt: value }, token);
    expect(response.status()).toBe(200);
    expectJsonResponse(response);
    const body = (await response.json()) as ChatSystemPrompt;
    expect(body.chatSystemPrompt).toBe(value);
  }

  test.describe('200', () => {
    test('persists a Unicode prompt for its owner without changing the peer or other prompt', async ({
      authenticatedUser, authenticatedPeer,
    }) => {
      const { token } = authenticatedUser;
      const marker = 'Answer clearly: zażółć 🧪\nKeep the second line.';
      const baseline = await test.step('Given the peer’s prompt and the owner’s other prompt', async () => {
        const peer = await readPrompt(authenticatedPeer.token);
        const response = await usersClient.getToolSystemPrompt(token);
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as ToolSystemPrompt;
        expectNonEmptyString(body.toolSystemPrompt);
        return { peer, other: body.toolSystemPrompt };
      });

      await test.step('When the owner updates the chat prompt', () => setPrompt(token, marker));
      await test.step('Then the owner reads the exact stored prompt', async () => {
        expect(await readPrompt(token)).toBe(marker);
      });
      await test.step('Then the peer and the owner’s other prompt remain unchanged', async () => {
        expect(await readPrompt(authenticatedPeer.token)).toBe(baseline.peer);
        const response = await usersClient.getToolSystemPrompt(token);
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as ToolSystemPrompt;
        expect(body.toolSystemPrompt).toBe(baseline.other);
      });
    });

    test('resets an override to the effective default with null', async ({ authenticatedUser }) => {
      const { token } = authenticatedUser;
      const defaultPrompt = await test.step('Given the default prompt and a stored override', async () => {
        const baseline = await readPrompt(token);
        const override = 'Temporary chat override for reset.';
        expect(baseline).not.toBe(override);
        await setPrompt(token, override);
        expect(await readPrompt(token)).toBe(override);
        return baseline;
      });
      await test.step('When resetting the stored override with null', () => setPrompt(token, null));
      await test.step('Then GET returns the original effective default', async () => {
        expect(await readPrompt(token)).toBe(defaultPrompt);
      });
    });
  });

  test.describe('400', () => {
    test('rejects an oversized prompt and preserves the previous value', async ({ authenticatedUser }) => {
      const { token } = authenticatedUser;
      const marker = 'Preserve this chat prompt after validation failure.';
      await test.step('Given a stored prompt', async () => {
        await setPrompt(token, marker);
        expect(await readPrompt(token)).toBe(marker);
      });
      const response = await test.step('When updating with 5001 ASCII characters', () =>
        usersClient.updateChatSystemPrompt({ chatSystemPrompt: 'x'.repeat(5001) }, token),
      );
      await test.step('Then verify the 400 JSON field validation error', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).chatSystemPrompt);
      });
      await test.step('Then the stored prompt remains unchanged', async () => {
        expect(await readPrompt(token)).toBe(marker);
      });
    });
  });

  test.describe('401', () => {
    test('rejects an update without authentication and preserves the test account’s prompt', async ({
      authenticatedUser,
    }) => {
      const { token } = authenticatedUser;
      const marker = 'Preserve this chat prompt after an unauthorized request.';
      await test.step('Given the test account’s stored prompt', () => setPrompt(token, marker));
      const response = await test.step('When updating without Authorization', () =>
        usersClient.updateChatSystemPrompt({ chatSystemPrompt: 'Unauthorized replacement' }),
      );
      await test.step('Then verify the 401 JSON authentication error', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        expectNonEmptyString((await response.json()).message);
      });
      await test.step('Then the test account’s prompt remains unchanged', async () => {
        expect(await readPrompt(token)).toBe(marker);
      });
    });
  });
});
