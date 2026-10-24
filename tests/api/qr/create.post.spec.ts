import { test } from '../../../fixtures/auth.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import { expectQrPng } from '../../../support/assertions/qr';
import type { ApiErrorResponse } from '../../../types/auth';
import type { QrValidationErrorResponse } from '../../../types/qr';
test.describe('POST /api/v1/qr/create', () => {
  test('200: returns a PNG for valid text', async ({ authenticatedUser, qrClient }) => {
    // Given
    const data = {
      text: 'https://example.invalid/qr-core'
    };

    // When
    const response = await qrClient.createQr(data, authenticatedUser.token);

    // Then
    await expectQrPng(response);
  });

  test('400: rejects blank text', async ({ authenticatedUser, qrClient }) => {
    // Given
    const data = { text: '   ' };

    // When
    const response = await qrClient.createQr(data, authenticatedUser.token);

    // Then
    const body = await json<QrValidationErrorResponse>(response, 400);
    expectNonEmptyString(body.text);
  });

  test('401: rejects missing authentication', async ({ qrClient }) => {
    // Given
    const data = {
      text: 'https://example.invalid/qr-core'
    };

    // When
    const response = await qrClient.createQr(data);

    // Then
    const body = await json<ApiErrorResponse>(response, 401);
    expectNonEmptyString(body.message);
  });
});
