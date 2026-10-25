import { expect } from '@playwright/test';
import type { TrafficClient } from '../../clients/traffic.client';
import type { TrafficLogEntry, TrafficLogsResponse } from '../../types/traffic';
import { json, expectNonEmptyString } from '../assertions/http';
import { expectTrafficPage } from '../assertions/traffic';

export async function waitForCapturedInfoRequest(traffic: TrafficClient, session: string): Promise<TrafficLogEntry> {
  let captured: TrafficLogEntry | undefined;
  await expect.poll(async () => {
    const logs = await json<TrafficLogsResponse>(await traffic.getLogs({ page: 0, size: 10 }, session));
    expectTrafficPage(logs, 0, 10);
    captured = logs.content.find(entry => entry.clientSessionId === session && entry.method === 'GET' && entry.path === '/api/v1/traffic/info' && entry.status === 200);
    return captured !== undefined;
  }, {
    message: 'The controlled request must appear in its session-scoped traffic logs',
    timeout: 5_000,
    intervals: [100, 250, 500],
  }).toBe(true);
  if (captured === undefined) throw new Error('Controlled traffic entry was not captured');
  expectNonEmptyString(captured.correlationId);
  return captured;
}
