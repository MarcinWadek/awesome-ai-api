import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { TrafficClient } from '../../../clients/traffic.client';
import { expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectTrafficPage } from '../../../support/assertions/traffic';
import type { TrafficErrorResponse, TrafficLogsResponse } from '../../../types/traffic';

test.use({ trace: 'off' });

test.describe('GET /api/v1/traffic/logs', () => {
  test.describe.configure({ retries: 0 });
  let trafficClient: TrafficClient;

  test.beforeEach(({ request }) => {
    trafficClient = new TrafficClient(request);
  });

  test.describe('200', () => {
    test('returns public paginated traffic metadata', async () => {
      const response = await test.step('When requesting a public page of two traffic entries', () =>
        trafficClient.getLogs({ page: 0, size: 2 }),
      );
      await test.step('Then page and entry metadata have the expected structure', async () => {
        expect(response.status()).toBe(200);
        expectJsonResponse(response);
        expectTrafficPage((await response.json()) as TrafficLogsResponse, 0, 2);
      });
    });

    test('paginates controlled traffic and excludes another session', async () => {
      const session = `api_${randomUUID()}`;
      const foreignSession = `api_${randomUUID()}`;
      await test.step('Given three successful requests in our session and one in another session', async () => {
        for (const requestSession of [session, session, session, foreignSession]) {
          const response = await trafficClient.getInfo(requestSession);
          expect(response.status()).toBe(200);
          expectJsonResponse(response);
        }
      });

      const pages = await test.step('When reading both session-scoped pages of size two', async () => {
        const result: TrafficLogsResponse[] = [];
        for (const page of [0, 1]) {
          const response = await trafficClient.getLogs({ page, size: 2 }, session);
          expect(response.status()).toBe(200);
          expectJsonResponse(response);
          result.push((await response.json()) as TrafficLogsResponse);
        }
        return result;
      });

      await test.step('Then all three entries are paginated consistently, newest first, without foreign traffic', async () => {
        for (const [pageNumber, page] of pages.entries()) {
          expectTrafficPage(page, pageNumber, 2);
          expect(page.totalElements).toBe(3);
          expect(page.totalPages).toBe(2);
        }
        const entries = pages.flatMap(page => page.content);
        expect(entries.length).toBe(3);
        expect(new Set(entries.map(entry => entry.correlationId)).size).toBe(3);
        for (const [index, entry] of entries.entries()) {
          expect(entry.clientSessionId).toBe(session);
          expect(entry.method).toBe('GET');
          expect(entry.path).toBe('/api/v1/traffic/info');
          expect(entry.status).toBe(200);
          if (index > 0) {
            expect(Date.parse(entries[index - 1]!.timestamp)).toBeGreaterThanOrEqual(Date.parse(entry.timestamp));
          }
        }
      });
    });
  });

  test.describe('400', () => {
    test('rejects a negative page index', async () => {
      const response = await test.step('When requesting page minus one', () =>
        trafficClient.getLogs({ page: -1, size: 2 }),
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
