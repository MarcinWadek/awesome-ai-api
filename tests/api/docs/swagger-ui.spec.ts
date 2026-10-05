import { expect, test } from '@playwright/test';

test.describe('GET /swagger-ui/index.html', () => {
  test.describe('200', () => {
    test('returns the Swagger UI HTML page', async ({ request }) => {
      const response = await test.step('Request the Swagger UI page', () =>
        request.get('/swagger-ui/index.html', {
          headers: { Accept: 'text/html' },
        }),
      );

      await test.step('Verify the 200 HTML response contains Swagger UI', async () => {
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('text/html');
        expect(await response.text()).toContain('Swagger UI');
      });
    });
  });
});
