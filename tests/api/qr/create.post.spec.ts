import { QrClient } from '../../../clients/qr.client';
import { expect, test } from '../../../fixtures/auth.fixture';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectQrPng } from '../../../support/assertions/qr';
import type { ApiErrorResponse } from '../../../types/auth';
import type { QrValidationErrorResponse } from '../../../types/qr';

test.describe('POST /api/v1/qr/create', () => {
  test.describe.configure({ retries: 0 });
  let qrClient: QrClient;

  test.beforeEach(({ request }) => {
    qrClient = new QrClient(request);
  });

  test.describe('200', () => {
    test('returns a PNG for valid text', async ({ authenticatedUser }) => {
      const data = await test.step('Given a valid text payload', async () => ({
        text: 'https://example.invalid/qr-core',
      }));
      const response = await test.step('When the authenticated user creates a QR code accepting PNG and JSON', () =>
        qrClient.createQr(data, authenticatedUser.token),
      );
      await test.step('Then the response is a complete 400 by 400 PNG', () => expectQrPng(response));
    });
  });

  test.describe('400', () => {
    test('rejects blank text', async ({ authenticatedUser }) => {
      const data = await test.step('Given a whitespace-only text payload', async () => ({ text: '   ' }));
      const response = await test.step('When the authenticated user submits the blank text', () =>
        qrClient.createQr(data, authenticatedUser.token),
      );
      await test.step('Then a JSON text validation error is returned', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        const body = (await response.json()) as QrValidationErrorResponse;
        expectNonEmptyString(body.text);
      });
    });
  });

  test.describe('401', () => {
    test('rejects missing authentication', async () => {
      const data = await test.step('Given valid text without an access token', async () => ({
        text: 'https://example.invalid/qr-core',
      }));
      const response = await test.step('When an anonymous user creates a QR code', () => qrClient.createQr(data));
      await test.step('Then a JSON authentication error is returned', async () => {
        expect(response.status()).toBe(401);
        expectJsonResponse(response);
        const body = (await response.json()) as ApiErrorResponse;
        expectNonEmptyString(body.message);
      });
    });
  });
});
