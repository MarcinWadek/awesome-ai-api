import { expect, test } from '../../../fixtures/clients.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import { expectAnonymousAccess, expectBearerRequired } from '../../../support/assertions/openapi';
import { protectedOperations, publicOperations } from '../../../support/contracts/openapi-policy';
import type { OpenApiDocument } from '../../../types/openapi';
test.describe('GET /v3/api-docs', () => {
  test('200: returns the expected OpenAPI document', async ({ request }) => {
    // When
    const response = await request.get('/v3/api-docs');

    // Then
    const document = await json<OpenApiDocument>(response);
    expectNonEmptyString(document.openapi);
    expect(document.openapi).toMatch(/^3\./);
    expectNonEmptyString(document.info?.title);
    expect(document.paths?.['/api/v1/users/signin']?.post).toBeDefined();
    expect(document.paths?.['/api/v1/users/password/forgot']?.post).toBeDefined();
  });

  test('200: declares the expected authentication policy', async ({ request }) => {
    // When
    const response = await request.get('/v3/api-docs');

    // Then
    const document = await json<OpenApiDocument>(response);
    expect(document.components?.securitySchemes?.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });

    for (const endpoint of protectedOperations) {
      // Then
      expectBearerRequired(document, endpoint);
    }

    for (const endpoint of publicOperations) {
      // Then
      expectAnonymousAccess(document, endpoint);
    }
  });
});
