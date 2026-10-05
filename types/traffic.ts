export interface TrafficInfoResponse {
  webSocketEndpoint: string;
  topic: string;
  description: string;
}

// Only metadata is modeled/asserted; shared request and response bodies stay private.
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

export interface TrafficErrorResponse {
  error: string;
}
