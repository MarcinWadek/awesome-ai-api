export interface TrafficInfoResponse {
  webSocketEndpoint: string;
  topic: string;
  description: string;
}

// List tests model only metadata; detail tests inspect only their own safe capture.
export interface TrafficLogEntry {
  correlationId: string;
  timestamp: string;
  clientSessionId: string | null;
  method: string;
  path: string;
  queryString: string | null;
  status: number;
  durationMs: number;
}

export interface TrafficLogsResponse {
  content: TrafficLogEntry[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface TrafficLogDetail extends TrafficLogEntry {
  requestHeaders: Record<string, string[]>;
  responseContentType: string | null;
  responseBody: unknown;
  responseBodyTruncated: boolean;
}

export interface TrafficErrorResponse {
  error: string;
}
