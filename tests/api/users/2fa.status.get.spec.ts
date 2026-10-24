import { json } from '../../../support/assertions/http';
import { test, expect } from '../../../fixtures/mfa.fixture';
import { expectMfaError } from '../../../support/assertions/mfa';
import type { MfaStatus } from '../../../types/mfa';
test.describe('GET /api/v1/users/2fa/status', () => {
  test.describe.configure({ timeout: 90_000 });

  test('200: reports disabled MFA and no recovery codes for a fresh account', async ({ mfaClient, mfaUser }) => {
    // When
    const response = await mfaClient.status(mfaUser.token);

    // Then
    expect(await json<MfaStatus>(response)).toEqual({ enabled: false, unusedRecoveryCodes: 0 });
  });

  test('401: requires authentication', async ({ mfaClient }) => {
    // When
    const response = await mfaClient.status();

    // Then
    await expectMfaError(response);
  });
});
