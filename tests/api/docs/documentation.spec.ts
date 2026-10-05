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
      const response = await request.get('/v3/api-docs');

      expect(response.status()).toBe(200);
      expectJsonResponse(response);

      const document = (await response.json()) as OpenApiDocument;
      expectNonEmptyString(document.openapi);
      expect(document.openapi).toMatch(/^3\./);
      expectNonEmptyString(document.info?.title);
      expect(document.paths?.['/api/v1/users/signin']?.post).toBeDefined();
      expect(document.paths?.['/api/v1/users/password/forgot']?.post).toBeDefined();
    });

    test('declares the expected authentication policy', async ({ request }) => {
      const response = await request.get('/v3/api-docs');

      expect(response.status()).toBe(200);
      expectJsonResponse(response);

      const document = (await response.json()) as OpenApiDocument;
      expect(document.components?.securitySchemes?.bearerAuth).toMatchObject({
        type: 'http',
        scheme: 'bearer',
      });

      for (const endpoint of protectedOperations) {
        expectBearerRequired(document, endpoint);
      }
      for (const endpoint of publicOperations) {
        expectAnonymousAccess(document, endpoint);
      }
    });
  });
});
