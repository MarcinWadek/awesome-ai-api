# Admin environments and disposable products

Completed historical implementation record, 12 October 2026. Scope approved:
two explicitly routed Playwright projects,
test-scoped admin authentication, product mutation client methods, owned product
creation/cleanup, and six examples. Evidence:
[admin exploration](../exploration/2026-10-12-admin-products.md).
Maintained coverage: [API coverage and status report](../../api-coverage-report.md).

## Delivery

- `api` selects existing `tests/api/**/*.spec.ts` on awesome; `admin` selects
  `tests/admin/**/*.spec.ts` on aitesters. No duplicate execution, project
  dependencies or serial mode. CI uses four workers; CLI workers remain configurable.
- Separate `ADMIN_API_*` environment variables, with credentials read on demand.
  Values are local/CI secrets; `.env.example` contains only empty placeholders.
  Absent URL variables use the agreed awesome/aitesters defaults, so neither
  project needs the other environment's configuration. Explicitly blank URLs fail.
- `authenticatedAdmin` signs in per test, checks staging routing, admin role and
  a nonempty access token, and exposes `{ token }`. It never logs out or changes
  the account. Playwright owns test-scoped request-context disposal.
- `ProductsClient` adds create/update/delete; create/update payloads have small
  TypeScript types. Clients are constructed during fixture or `beforeEach` setup.
- Product specs initialize clients and UUID-named data in `beforeEach`, then call
  client methods directly. Their `afterEach` reads the catalogue and deletes
  products matching that exact unique name, accepting 204/404. Partial updates
  change price/stock while retaining the name. There is no product fixture, ID
  registry, timestamp guard or authentication retry helper.
- `safeRequest` protects the final error in product/auth/user client methods;
  specs and fixtures no longer call it. The first reporter separately redacts
  automatically recorded API errors before list/HTML serialization, removing
  stack/snippet/cause/value while keeping source location. The existing
  registered-user fixture lifecycle remains unchanged.

The initially delivered product fixture was removed at the user's request.
Admin setup was reduced to login, role/token checks and staging routing. Existing
non-admin account fixtures remain available, including for the staging client 403.

Six cases in four endpoint specs: admin sign-in/profile 200; product create 201,
anonymous 401, client 403; partial update 200/read-back; deletion 204/lookup 404.
Given/When/Then steps and ascending status order are retained. Authorization
examples create no products when correctly rejected, but unexpected successful
creations are still tracked and cleaned up.

Future cart/order tests must keep user/product/cart tokens and resources on
staging and remove dependent records before product teardown. Those helpers,
inventory/user/order administration and extensive negative cases are deferred.

## Verification

Discovery: 70 existing tests under `api`, six under `admin`; 76 total in 27 files.
Original delivery admin batch after the cleanup ownership guard: **6/6 passed**, 6.2s, four workers,
zero retries, 12 October 2026. Initial combined run: **76/76 passed**, 49.1s.
A focused run of existing generate tests plus admin specs passed **9/9**, 11.7s;
JSON start/end times confirmed both cross-project and concurrent-admin overlap.
Report: ignored `exploration-results/admin-overlap.json`.

Two temporary probes deliberately failed after creation: one assertion failure
and one simulated lost creation response. Both teardown paths completed; a
subsequent authenticated lookup returned 404 for each owned ID, and the catalogue
contained zero `api-test-` products. The temporary spec was removed. Probe artifacts
contain product IDs only, in ignored `exploration-results/admin-cleanup-check/`.
The creation-timestamp ownership guard was then added and the admin batch rerun.

Original combined rerun after the cleanup guard: **76/76 passed**, 49.4s, four
workers, zero retries, 12 October 2026. Typecheck and `git diff --check` passed.
Final checks confirmed the local `.env` is ignored/untracked, admin credential
placeholders are empty, and no admin password or JWT pattern appears in changed
source or generated report/probe artifacts. No trace archives were generated.
The final authenticated catalogue check found zero `api-test-` products.

Simplification validation: **6/6 admin tests passed**, 8.8s, then **76/76 combined
tests passed**, 50.4s, four workers and zero retries, 12 October 2026. Typecheck,
discovery (76 tests in 27 files) and `git diff --check` passed. A temporary assertion
failure was injected into the existing create test and immediately restored;
its `afterEach` succeeded, and the catalogue check found zero test products.
No additional permanent tests were added. Source/report checks found no admin
password or JWT patterns and no trace archives. Earlier results above describe
the original delivery, including the subsequently removed product fixture.

Report/configuration follow-up: local review found that the prior plain-text
HTML scan did not inspect the embedded ZIP and `safeRequest` alone did not redact
automatic API-step errors. Added `support/redact-errors.reporter.ts` first in the
reporter chain and URL defaults in `support/config.ts`; fixture scope is unchanged.
Two temporary local report probes passed; decoded HTML, JSON and result files
contained no placeholder token and HTML recorded three sanitized errors.
Independent project discovery passed with dotenv disabled and all credentials/
URLs absent (70 api / six admin). Admin rerun: **6/6 passed**, 6.5s, four workers,
zero retries. Combined rerun: **76/76 passed**, 48.8s, four workers, zero retries,
12 October 2026. Typecheck, discovery and `git diff --check` passed. The redaction
reporter must remain first; CLI reporter overrides must explicitly retain it for
real requests. It does not sanitize traces, arbitrary logging or attachments;
admin traces stay disabled and secrets must not be logged/attached.
Final scans included the decoded ZIP embedded in HTML and found no admin password
or JWT pattern in source/report/result artifacts, and no trace archives. The
final staging catalogue check found zero test products.

Limits: daily reset timing and interruption were not exercised; terminated
processes can prevent teardown. Cleanup requires a usable admin token and the
scenario's unique product name. Cart/order dependencies
remain outside this delivery. Existing signup specs still retain their generated
accounts on awesome; their lifecycle was not expanded by this work.
