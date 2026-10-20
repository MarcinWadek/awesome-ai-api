# Traffic detail exploration

Observed on 20 October 2026 at `https://awesome.byst.re` (`api` project).
Earlier list/info evidence: [6 October exploration](2026-10-06-traffic-products-prompts.md).

Sources: today's live `/v3/api-docs`, saved `docs/api-docs.json`, and read-only
backend `TrafficController`, `TrafficLogService`, `TrafficLogEntryDto`,
`TrafficLoggingFilter`, `TrafficProperties`, `ApiContractOpenApiCustomizer`, and
`WebSecurityConfig`. Live traffic operations declare `security: []`; the session
header is optional in this deployment's legacy public mode. Detail documents
200 with the captured entry and 404 with an empty body. Normal secured mode is a
different deployment configuration and was not inferred from legacy behavior.

Each of two runs generated a unique `api_<UUID>` X-Client-Session-Id, made an
anonymous `GET /api/v1/traffic/info` with that header, then read
`GET /api/v1/traffic/logs?page=0&size=10` with the same header. Only that run's
entry matching session, GET, path and 200 was selected. No arbitrary shared entry
was inspected. Both scoped lists contained exactly one entry on the first read;
the runner allowed up to 20 attempts at 250 ms. Logs requests are excluded from
capture by the referenced backend defaults.

| Request | Expected | Observed |
| --- | --- | --- |
| Controlled anonymous info | 200, session topic | 200, `/topic/traffic/api_<UUID>` |
| Anonymous scoped list | 200, own captured entry | 200, one matching entry |
| Own correlation ID, same session, no auth | 200 captured entry | 500 JSON `{"message":"Internal server error"}` in both runs |
| Own correlation ID, no session, no auth | 200 in legacy mode | Same 500 in both runs |
| Own correlation ID, same session, valid Bearer | 200 | Same 500 in follow-up run |
| Own correlation ID, another unique session | Empty 404 | Empty 404 in follow-up run |
| Fresh UUID correlation ID, own session, no auth | Empty 404 | Empty 404 in both runs, no Content-Type |

The own list entry contained matching session/method/path/status, a UUID
correlation ID, and the captured info JSON with its unique topic. Authentication
does not resolve the detail failure. Root cause is unconfirmed; see the
[traffic detail defect](../traffic-detail-bug-report.md). Keep the intended 200
assertion, and report its live failure rather than accepting 500 or skipping it.

Two disposable users enabled authenticated probes; both were forgotten with 204.
Permanent traffic tests need no user because this deployment is public; their
capture contains no credentials or account data. Traffic has no deletion API;
owned diagnostic entries remain subject to server retention. New tests use a
5-second bounded poll for asynchronous capture, scoped to the unique session.
Deferred: secured-mode authentication, invalid session validation (existing
info coverage), filters and additional ownership cases beyond these core tests.

Raw sanitized observations and the ad hoc runner are gitignored under
`exploration-results/2026-10-20-qr-traffic.json` and `qr-traffic-probe.cjs`.
Implementation: [traffic detail tests](../implementation/traffic-detail-tests.md).
