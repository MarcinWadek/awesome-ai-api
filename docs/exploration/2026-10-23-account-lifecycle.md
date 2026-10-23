# Account deletion and email-event read exploration

**Date:** 23 October 2026  
**Environment:** API project, `https://awesome.byst.re`  
**Operations:** `DELETE /api/v1/users/{username}/right-to-be-forgotten`; `GET /api/v1/users/me/email-events`

## Contract sources

The saved [OpenAPI contract](../api-docs.json) declares deletion responses 204, 401, 403 and 404, and email-event read responses 200 and 401. The backend reference controller and endpoint tests establish owner deletion, peer denial, empty success responses, owned-record cleanup, and a current-user event query. These backend files are reference evidence; no backend source was changed.

## Disposable-account observations

All API requests used generated disposable accounts. Credentials and tokens stayed in test memory; traces were disabled and the configured redacting reporter was used. No response bodies containing credentials or tokens were saved.

| Request condition | Expected | Observed |
| --- | --- | --- |
| Owner deletes its own account | 204, empty body | 204, empty body |
| Independent user looks up deleted profile | 404 | 404 |
| Deleted user's saved refresh token is used | Rejected | 401 |
| Missing JWT requests account deletion | 401 | 401; a separate observer still read the target as 200 |
| Client requests deletion of a peer | 403; target remains | 403; observer still read target as 200 |
| Fresh account reads email events | 200 with an empty array | 200 with `[]` |
| Missing JWT reads email events | 401 | 401 |

The first focused run exposed a cleanup edge after successful deletion: teardown repeated DELETE with the removed account's JWT and observed 500. The final fixture now asks an independently authenticated observer whether the target exists before cleanup, skips deletion only after observer 404, and verifies observer 404 after deleting any account that remains. The final focused suite passed all five tests with zero retries, including teardown. The repeat-delete failure is documented separately in the [deleted-account JWT bug report](../deleted-account-jwt-bug-report.md); the test suite does not accept 500 as a successful deletion result.

## Cleanup and limits

Each lifecycle target was either confirmed absent by an independent observer after the operation or deleted by its owner and then confirmed absent. Observer accounts and the email-event account use the existing authentication fixture's owner cleanup, which requires 204 but does not perform another independent lookup. The automated deletion case verifies profile removal and refresh-token revocation. It does not independently inspect every owned record type, so it makes no claim of full cascade verification through the public API.

Email-event coverage is limited to the fresh-account empty result and missing authentication. Creating or isolating nonempty events is deferred until the controlled email-sending work. After subagent delivery, parent review reran the focused cases (5/5 passed, 9.6s), then the full suite (153/153 passed, 2.9 minutes, four workers, zero retries). Results and typecheck are recorded in the [implementation record](../implementation/account-lifecycle-tests.md).
