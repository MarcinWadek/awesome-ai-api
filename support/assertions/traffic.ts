import { expect } from '@playwright/test';
import type { TrafficLogsResponse } from '../../types/traffic';
import { expectNonEmptyString } from './http';

export function expectTrafficPage(body: TrafficLogsResponse, page: number, size: number): void {
  expect(Array.isArray(body.content)).toBe(true);
  expect(body.pageNumber).toBe(page);
  expect(body.pageSize).toBe(size);
  expect(Number.isInteger(body.totalElements)).toBe(true);
  expect(body.totalElements).toBeGreaterThanOrEqual(0);
  expect(body.totalPages).toBe(Math.ceil(body.totalElements / size));
  expect(body.content.length).toBeLessThanOrEqual(size);
  expect(body.content.length).toBe(Math.min(size, Math.max(0, body.totalElements - page * size)));

  for (const entry of body.content) {
    expectNonEmptyString(entry.correlationId);
    expectNonEmptyString(entry.timestamp);
    expect(Number.isFinite(Date.parse(entry.timestamp))).toBe(true);
    expect(entry.clientSessionId === null || typeof entry.clientSessionId === 'string').toBe(true);
    expectNonEmptyString(entry.method);
    expect(entry.path).toMatch(/^\//);
    expect(entry.queryString === null || typeof entry.queryString === 'string').toBe(true);
    expect(Number.isInteger(entry.status)).toBe(true);
    expect(entry.status).toBeGreaterThanOrEqual(100);
    expect(entry.status).toBeLessThanOrEqual(599);
    expect(Number.isInteger(entry.durationMs)).toBe(true);
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  }
}
