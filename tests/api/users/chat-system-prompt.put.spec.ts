import { readChatPrompt, setChatPrompt } from '../../../support/helpers/prompts';
import type { ApiErrorResponse } from '../../../types/auth';
import { expect, test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import type { ChatSystemPrompt, ToolSystemPrompt } from '../../../types/prompts';
test.describe('PUT /api/v1/users/chat-system-prompt', () => {
  test('200: persists a Unicode prompt for its owner without changing the peer or other prompt', async ({ authenticatedUser, authenticatedPeer, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const marker = 'Answer clearly: zażółć 🧪\nKeep the second line.';
    const peer = await readChatPrompt(usersClient, authenticatedPeer.token);
    const response = await usersClient.getToolSystemPrompt(token);
    const body = await json<ToolSystemPrompt>(response);
    expectNonEmptyString(body.toolSystemPrompt);
    const baseline = { peer, other: body.toolSystemPrompt };

    // When
    const update = await usersClient.updateChatSystemPrompt({ chatSystemPrompt: marker }, token);

    // Then
    expect((await json<ChatSystemPrompt>(update)).chatSystemPrompt).toBe(marker);
    expect(await readChatPrompt(usersClient, token)).toBe(marker);
    expect(await readChatPrompt(usersClient, authenticatedPeer.token)).toBe(baseline.peer);
    const verifiedResponse = await usersClient.getToolSystemPrompt(token);
    const verifiedBody = await json<ToolSystemPrompt>(verifiedResponse);
    expect(verifiedBody.toolSystemPrompt).toBe(baseline.other);
  });

  test('200: resets an override to the effective default with null', async ({ authenticatedUser, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const defaultPrompt = await readChatPrompt(usersClient, token);
    const override = 'Temporary chat override for reset.';
    expect(defaultPrompt).not.toBe(override);
    await setChatPrompt(usersClient, token, override);
    expect(await readChatPrompt(usersClient, token)).toBe(override);

    // When
    const update = await usersClient.updateChatSystemPrompt({ chatSystemPrompt: null }, token);

    // Then
    expect((await json<ChatSystemPrompt>(update)).chatSystemPrompt).toBe(null);
    expect(await readChatPrompt(usersClient, token)).toBe(defaultPrompt);
  });

  test('400: rejects an oversized prompt and preserves the previous value', async ({ authenticatedUser, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const marker = 'Preserve this chat prompt after validation failure.';
    await setChatPrompt(usersClient, token, marker);
    expect(await readChatPrompt(usersClient, token)).toBe(marker);

    // When
    const response = await usersClient.updateChatSystemPrompt({ chatSystemPrompt: 'x'.repeat(5001) }, token);

    // Then
    expectNonEmptyString((await json<{ chatSystemPrompt: string }>(response, 400)).chatSystemPrompt);
    expect(await readChatPrompt(usersClient, token)).toBe(marker);
  });

  test('401: rejects an update without authentication and preserves the test account’s prompt', async ({ authenticatedUser, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const marker = 'Preserve this chat prompt after an unauthorized request.';
    await setChatPrompt(usersClient, token, marker);

    // When
    const response = await usersClient.updateChatSystemPrompt({ chatSystemPrompt: 'Unauthorized replacement' });

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
    expect(await readChatPrompt(usersClient, token)).toBe(marker);
  });
});
