import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { TrafficClient } from '../../../clients/traffic.client';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectTrafficPage } from '../../../support/assertions/traffic';
import type {
  TrafficInfoResponse, TrafficLogDetail, TrafficLogEntry, TrafficLogsResponse,
} from '../../../types/traffic';

// This deployment exposes traffic publicly in legacy mode. Capture no credentials.
test.use({ trace: 'off' });

test.describe('GET /api/v1/traffic/logs/{correlationId}', () => {
  test.describe.configure({ retries: 0 });
  let trafficClient: TrafficClient;

  test.beforeEach(({ request }) => {
    trafficClient = new TrafficClient(request);
  });

  test.describe('200', () => {
    test('retrieves our own captured request without authentication in legacy mode', async () => {
      const session = `api_${randomUUID()}`;
      const { captured, info } = await test.step('Given a controlled request captured under a unique session', async () => {
        const response = await trafficClient.getInfo(session);
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const info = (await response.json()) as TrafficInfoResponse;
        expect(info.topic).toBe(`/topic/traffic/${session}`);
        expect(info.webSocketEndpoint).toBe('/api/v1/ws-traffic');
        expectNonEmptyString(info.description);

        let captured: TrafficLogEntry | undefined;
        await expect.poll(async () => {
          const logsResponse = await trafficClient.getLogs({ page: 0, size: 10 }, session);
          expect(logsResponse.status()).toBe(200);
          expectJsonResponse(logsResponse);
          const logs = (await logsResponse.json()) as TrafficLogsResponse;
          expectTrafficPage(logs, 0, 10);
          captured = logs.content.find(entry =>
            entry.clientSessionId === session && entry.method === 'GET'
              && entry.path === '/api/v1/traffic/info' && entry.status === 200,
          );
          return captured !== undefined;
        }, {
          message: 'The controlled request must appear in its session-scoped traffic logs',
          timeout: 5_000,
          intervals: [100, 250, 500],
        }).toBe(true);
        if (captured === undefined) throw new Error('Controlled traffic entry was not captured');
        expectNonEmptyString(captured.correlationId);
        return { captured, info };
      });

      const response = await test.step('When reading the captured correlation ID with the same session', () =>
        trafficClient.getLog(captured.correlationId, session),
      );

      await test.step('Then the 200 JSON detail matches our request and its captured response', async () => {
        // Keep the contract expectation: see docs/traffic-detail-bug-report.md for the live 500.
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        const body = (await response.json()) as TrafficLogDetail;
        expect(body).toMatchObject({
          correlationId: captured.correlationId,
          timestamp: captured.timestamp,
          clientSessionId: session,
          method: 'GET',
          path: '/api/v1/traffic/info',
          queryString: null,
          status: 200,
          durationMs: captured.durationMs,
        });
        const headers = Object.fromEntries(
          Object.entries(body.requestHeaders).map(([name, values]) => [name.toLowerCase(), values]),
        );
        expect(headers['x-client-session-id']).toEqual([session]);
        expect(body.responseContentType).toContain('application/json');
        expect(body.responseBodyTruncated).toBe(false);
        expect(body.responseBody).toEqual(info);
      });
    });
  });

  test.describe('404', () => {
    test('returns an empty response for an unknown correlation ID', async () => {
      const { correlationId, session } = await test.step('Given an unknown UUID and a unique session', async () => ({
        correlationId: randomUUID(),
        session: `api_${randomUUID()}`,
      }));
      const response = await test.step('When reading the unknown correlation ID without authentication', () =>
        trafficClient.getLog(correlationId, session),
      );
      await test.step('Then the response is 404 with no body', async () => {
        expect(response.status()).toBe(404);
        expect(await response.body()).toHaveLength(0);
      });
    });
  });
});
