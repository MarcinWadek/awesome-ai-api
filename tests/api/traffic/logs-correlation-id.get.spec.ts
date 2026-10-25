import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../fixtures/clients.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import { waitForCapturedInfoRequest } from '../../../support/helpers/traffic';
import type { TrafficInfoResponse, TrafficLogDetail } from '../../../types/traffic';

// This deployment exposes traffic publicly in legacy mode. Capture no credentials.

test.describe('GET /api/v1/traffic/logs/{correlationId}', () => {
  test('200: retrieves our own captured request without authentication in legacy mode', async ({ trafficClient }) => {
    // Given
    const session = `api_${randomUUID()}`;
    const setupResponse = await trafficClient.getInfo(session);
    const info = await json<TrafficInfoResponse>(setupResponse);
    expect(info.topic).toBe(`/topic/traffic/${session}`);
    expect(info.webSocketEndpoint).toBe('/api/v1/ws-traffic');
    expectNonEmptyString(info.description);
    const captured = await waitForCapturedInfoRequest(trafficClient, session);

    // When
    const response = await trafficClient.getLog(captured.correlationId, session);

    // Then
    // Historical 500: docs/bug-reports.md#bug-005-existing-traffic-detail-returned-500.

    const body = await json<TrafficLogDetail>(response);
    expect(body).toMatchObject({
      correlationId: captured.correlationId,
      timestamp: captured.timestamp,
      clientSessionId: session,
      method: 'GET',
      path: '/api/v1/traffic/info',
      queryString: null,
      status: 200,
      durationMs: captured.durationMs
    });
    const headers = Object.fromEntries(Object.entries(body.requestHeaders).map(([name, values]) => [name.toLowerCase(), values]));
    expect(headers['x-client-session-id']).toEqual([session]);
    expect(body.responseContentType).toContain('application/json');
    expect(body.responseBodyTruncated).toBe(false);
    expect(body.responseBody).toEqual(info);
  });

  test('404: returns an empty response for an unknown correlation ID', async ({ trafficClient }) => {
    // Given
    const { correlationId, session } = { correlationId: randomUUID(), session: `api_${randomUUID()}` };

    // When
    const response = await trafficClient.getLog(correlationId, session);

    // Then
    expect(response.status()).toBe(404);
    expect(await response.body()).toHaveLength(0);
  });
});
