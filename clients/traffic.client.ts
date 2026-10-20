import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface TrafficLogsQuery {
  page?: number;
  size?: number;
}

export class TrafficClient {
  constructor(private readonly request: APIRequestContext) {}

  getInfo(sessionId?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/traffic/info', {
      headers: sessionId === undefined ? undefined : { 'X-Client-Session-Id': sessionId },
    });
  }

  getLogs(query: TrafficLogsQuery = {}, sessionId?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/traffic/logs', {
      params: { ...query },
      headers: sessionId === undefined ? undefined : { 'X-Client-Session-Id': sessionId },
    });
  }

  getLog(correlationId: string, sessionId?: string): Promise<APIResponse> {
    return this.request.get(`/api/v1/traffic/logs/${encodeURIComponent(correlationId)}`, {
      headers: sessionId === undefined ? undefined : { 'X-Client-Session-Id': sessionId },
    });
  }
}
