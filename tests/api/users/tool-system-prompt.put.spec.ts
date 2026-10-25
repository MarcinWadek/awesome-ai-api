import { readToolPrompt, setToolPrompt } from '../../../support/helpers/prompts';
import type { ApiErrorResponse } from '../../../types/auth';
import { expect, test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import type { ToolSystemPrompt, ChatSystemPrompt } from '../../../types/prompts';
test.describe('PUT /api/v1/users/tool-system-prompt', () => {
  test('200: persists a Unicode prompt for its owner without changing the peer or other prompt', async ({ authenticatedUser, authenticatedPeer, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const marker = 'Answer clearly: zażółć 🧪\nKeep the second line.';
    const peer = await readToolPrompt(usersClient, authenticatedPeer.token);
    const response = await usersClient.getChatSystemPrompt(token);
    const body = await json<ChatSystemPrompt>(response);
    expectNonEmptyString(body.chatSystemPrompt);
    const baseline = { peer, other: body.chatSystemPrompt };

    // When
    const update = await usersClient.updateToolSystemPrompt({ toolSystemPrompt: marker }, token);

    // Then
    expect((await json<ToolSystemPrompt>(update)).toolSystemPrompt).toBe(marker);
    expect(await readToolPrompt(usersClient, token)).toBe(marker);
    expect(await readToolPrompt(usersClient, authenticatedPeer.token)).toBe(baseline.peer);
    const verifiedResponse = await usersClient.getChatSystemPrompt(token);
    const verifiedBody = await json<ChatSystemPrompt>(verifiedResponse);
    expect(verifiedBody.chatSystemPrompt).toBe(baseline.other);
  });

  test('200: resets an override to the effective default with null', async ({ authenticatedUser, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const defaultPrompt = await readToolPrompt(usersClient, token);
    const override = 'Temporary tool override for reset.';
    expect(defaultPrompt).not.toBe(override);
    await setToolPrompt(usersClient, token, override);
    expect(await readToolPrompt(usersClient, token)).toBe(override);

    // When
    const update = await usersClient.updateToolSystemPrompt({ toolSystemPrompt: null }, token);

    // Then
    expect((await json<ToolSystemPrompt>(update)).toolSystemPrompt).toBe(null);
    expect(await readToolPrompt(usersClient, token)).toBe(defaultPrompt);
  });

  test('400: rejects an oversized prompt and preserves the previous value', async ({ authenticatedUser, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const marker = 'Preserve this tool prompt after validation failure.';
    await setToolPrompt(usersClient, token, marker);
    expect(await readToolPrompt(usersClient, token)).toBe(marker);

    // When
    const response = await usersClient.updateToolSystemPrompt({ toolSystemPrompt: 'x'.repeat(5001) }, token);

    // Then
    expectNonEmptyString((await json<{ toolSystemPrompt: string }>(response, 400)).toolSystemPrompt);
    expect(await readToolPrompt(usersClient, token)).toBe(marker);
  });

  test('401: rejects an update without authentication and preserves the test account’s prompt', async ({ authenticatedUser, usersClient }) => {
    // Given
    const { token } = authenticatedUser;
    const marker = 'Preserve this tool prompt after an unauthorized request.';
    await setToolPrompt(usersClient, token, marker);

    // When
    const response = await usersClient.updateToolSystemPrompt({ toolSystemPrompt: 'Unauthorized replacement' });

    // Then
    expectNonEmptyString((await json<ApiErrorResponse>(response, 401)).message);
    expect(await readToolPrompt(usersClient, token)).toBe(marker);
  });
});
