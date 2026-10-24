import { randomUUID } from 'node:crypto';
import { expect, test } from '../../../fixtures/clients.fixture';
import { json, expectJsonResponse, expectNonEmptyString } from '../../../support/assertions/http';
import { expectTrafficPage } from '../../../support/assertions/traffic';
import type { TrafficErrorResponse, TrafficLogsResponse } from '../../../types/traffic';
test.describe('GET /api/v1/traffic/logs', () => {
  test('200: returns public paginated traffic metadata', async ({ trafficClient }) => {
    // When
    const response = await trafficClient.getLogs({ page: 0, size: 2 });

    // Then
    expectTrafficPage(await json<TrafficLogsResponse>(response), 0, 2);
  });

  test('200: paginates controlled traffic and excludes another session', async ({ trafficClient }) => {
    // Given
    const session = `api_${randomUUID()}`;
    const foreignSession = `api_${randomUUID()}`;

    for (const requestSession of [session, session, session, foreignSession]) {
      const response = await trafficClient.getInfo(requestSession);
      expect(response.status()).toBe(200);
      expectJsonResponse(response);
    }

    // When
    const pages: TrafficLogsResponse[] = [];

    for (const page of [0, 1]) {
      const response = await trafficClient.getLogs({ page, size: 2 }, session);
      pages.push(await json<TrafficLogsResponse>(response));
    }

    // Then

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

  test('400: rejects a negative page index', async ({ trafficClient }) => {
    // When
    const response = await trafficClient.getLogs({ page: -1, size: 2 });

    // Then
    const body = await json<TrafficErrorResponse>(response, 400);
    expectNonEmptyString(body.error);
  });
});
