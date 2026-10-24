import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../fixtures/clients.fixture';
import { json, expectNonEmptyString } from '../../../support/assertions/http';
import type { TrafficErrorResponse, TrafficInfoResponse } from '../../../types/traffic';
test.describe('GET /api/v1/traffic/info', () => {
  test('200: returns public default connection information', async ({ trafficClient }) => {
    // When
    const response = await trafficClient.getInfo();

    // Then
    const body = await json<TrafficInfoResponse>(response);
    expect(body.webSocketEndpoint).toBe('/api/v1/ws-traffic');
    expect(body.topic).toBe('/topic/traffic');
    expectNonEmptyString(body.description);
  });

  test('200: selects the topic for a valid session', async ({ trafficClient }) => {
    // Given
    const session = `api_${randomUUID()}`;

    // When
    const response = await trafficClient.getInfo(session);

    // Then
    const body = await json<TrafficInfoResponse>(response);
    expect(body.webSocketEndpoint).toBe('/api/v1/ws-traffic');
    expect(body.topic).toBe(`/topic/traffic/${session}`);
    expectNonEmptyString(body.description);
  });

  test('400: rejects an invalid session header', async ({ trafficClient }) => {
    // When
    const response = await trafficClient.getInfo('short');

    // Then
    const body = await json<TrafficErrorResponse>(response, 400);
    expectNonEmptyString(body.error);
  });
});
