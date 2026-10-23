# Existing traffic detail returns 500

23 October recheck: the unchanged regression test returned the expected 200 and
passed its captured-request/body assertions during the commerce reduction run.
The earlier 500 was not reproduced. Root cause and any deployment change are
unconfirmed; no backend change was made by this task. See the
[23 October verification record](implementation/commerce-workflow-tests.md).
The full suite passed **148/148** (3.0m, four workers, zero retries).

Confirmed with two independent captures on 20 October 2026 at
`https://awesome.byst.re`. Evidence: [traffic exploration](exploration/2026-10-20-traffic-details.md).

1. Generate a unique `api_<UUID>` X-Client-Session-Id.
2. GET `/api/v1/traffic/info` anonymously with that header; expect 200.
3. GET `/api/v1/traffic/logs?page=0&size=10` with that header, polling if needed.
   Find only the entry matching this session, GET, `/api/v1/traffic/info`, and 200.
4. GET `/api/v1/traffic/logs/<captured correlationId>` with the same header.

Expected: 200 with that captured entry, per live OpenAPI's `TrafficLogEntryDto`
response and the backend controller's successful lookup path. Live OpenAPI has
`security: []` for traffic in this legacy deployment.
Actual: 500 JSON `{"message":"Internal server error"}`. Repeating with a valid
Bearer token or without the session header also returns 500. The same entry is
readable in the scoped list. Another session and a fresh unknown UUID return the
documented empty 404, so the failure occurs for found entries. Root cause is
unconfirmed; backend logs were not accessed.

The regression test retains its 200 assertion and runs normally. No expected
failure annotation, skip, or acceptance of 500 masks the application defect.

Reconfirmed during the 20 October commerce full regression: **168 passed,
1 failed** (3.5m, four workers, zero retries). This remains the sole failure;
all 94 staging/admin cases passed. See the
[commerce verification record](implementation/commerce-workflow-tests.md).
