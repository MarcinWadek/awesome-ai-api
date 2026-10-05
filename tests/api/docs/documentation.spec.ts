import { expect, test } from '@playwright/test';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import {
  expectAnonymousAccess,
  expectBearerRequired,
} from '../../../support/assertions/openapi';
import {
  protectedOperations,
  publicOperations,
} from '../../../support/contracts/openapi-policy';
import type { OpenApiDocument } from '../../../types/openapi';

test.describe('GET /v3/api-docs', () => {
  test.describe('200', () => {
    test('returns the expected OpenAPI document', async ({ request }) => {
      const response = await test.step('Request the OpenAPI document', () =>
        request.get('/v3/api-docs'),
      );

      await test.step('Verify the 200 JSON response', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
      });

      await test.step('Verify OpenAPI metadata and expected user endpoints', async () => {
        const document = (await response.json()) as OpenApiDocument;
        expectNonEmptyString(document.openapi);
        expect(document.openapi).toMatch(/^3\./);
        expectNonEmptyString(document.info?.title);
        expect(document.paths?.['/api/v1/users/signin']?.post).toBeDefined();
        expect(document.paths?.['/api/v1/users/password/forgot']?.post).toBeDefined();
      });
    });

    test('declares the expected authentication policy', async ({ request }) => {
      const response = await test.step('Request the OpenAPI document', () =>
        request.get('/v3/api-docs'),
      );

      await test.step('Verify the 200 JSON response', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
      });

      const document = (await response.json()) as OpenApiDocument;
      await test.step('Verify the HTTP Bearer security scheme', async () => {
        expect(document.components?.securitySchemes?.bearerAuth).toMatchObject({
          type: 'http',
          scheme: 'bearer',
        });
      });

      for (const endpoint of protectedOperations) {
        await test.step(`Verify ${endpoint[0].toUpperCase()} ${endpoint[1]} requires Bearer authentication`, async () => {
          expectBearerRequired(document, endpoint);
        });
      }
      for (const endpoint of publicOperations) {
        await test.step(`Verify ${endpoint[0].toUpperCase()} ${endpoint[1]} allows anonymous access`, async () => {
          expectAnonymousAccess(document, endpoint);
        });
      }
    });
  });
});
