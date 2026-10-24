import { expect, test } from '../../../fixtures/clients.fixture';
test.describe('GET /swagger-ui/index.html', () => {
  test('200: returns the Swagger UI HTML page', async ({ request }) => {
    // When
    const response = await request.get('/swagger-ui/index.html', {
      headers: { Accept: 'text/html' }
    });

    // Then
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(await response.text()).toContain('Swagger UI');
  });
});
