import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { TrafficClient } from '../../../clients/traffic.client';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import type { TrafficErrorResponse, TrafficInfoResponse } from '../../../types/traffic';

test.use({ trace: 'off' });

test.describe('GET /api/v1/traffic/info', () => {
  test.describe.configure({ retries: 0 });
  let trafficClient: TrafficClient;

  test.beforeEach(({ request }) => {
    trafficClient = new TrafficClient(request);
  });

  test.describe('200', () => {
    test('returns public default connection information', async () => {
      const response = await test.step('When requesting connection information without a session', () =>
        trafficClient.getInfo(),
      );
      await test.step('Then the public WebSocket endpoint and topic are returned', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as TrafficInfoResponse;
        expect(body.webSocketEndpoint).toBe('/api/v1/ws-traffic');
        expect(body.topic).toBe('/topic/traffic');
        expectNonEmptyString(body.description);
      });
    });

    test('selects the topic for a valid session', async () => {
      const session = await test.step('Given a unique valid session', async () => `api_${randomUUID()}`);
      const response = await test.step('When requesting connection information for that session', () =>
        trafficClient.getInfo(session),
      );
      await test.step('Then the topic is scoped to the supplied session', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as TrafficInfoResponse;
        expect(body.webSocketEndpoint).toBe('/api/v1/ws-traffic');
        expect(body.topic).toBe(`/topic/traffic/${session}`);
        expectNonEmptyString(body.description);
      });
    });
  });

  test.describe('400', () => {
    test('rejects an invalid session header', async () => {
      const response = await test.step('When requesting information with a session shorter than 16 characters', () =>
        trafficClient.getInfo('short'),
      );
      await test.step('Then a JSON validation error is returned', async () => {
        expect(response.status()).toBe(400);
        expectJsonResponse(response);
        const body = (await response.json()) as TrafficErrorResponse;
        expectNonEmptyString(body.error);
      });
    });
  });
});
