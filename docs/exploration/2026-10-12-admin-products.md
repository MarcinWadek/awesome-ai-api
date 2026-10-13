# Admin authentication and disposable products

Explored on 12 October 2026 against `https://aitesters.byst.re` before implementation.
Existing non-admin configuration remains `https://awesome.byst.re`.
Sources: staging `/v3/api-docs`, saved `docs/api-docs.json`, backend product
controller/service/DTOs, user and refresh-token services, inventory migrations,
and existing Playwright configuration, clients and fixtures. Backend and course
reference files were read only.

## Observations

Two separate request contexts signed in as the same admin concurrently: both
returned 200, `ROLE_ADMIN`, access/refresh tokens and `mfaRequired: false`.
Both authenticated `/users/me` with 200 and admin roles. Access JWT strings were
identical; refresh tokens differed. Do not require distinct access JWT strings.
Refreshing session A rotated its refresh token with 200. Session B's original
access and refresh tokens still worked with 200. Original access JWTs remained
usable after rotation. Successful product mutations established admin permission.

| Request | Expected / observed |
| --- | --- |
| Admin POST `/api/v1/products` with a UUID name, description, price 12.34, stock 7, category and null image URL | 201; positive ID, matching fields, timestamps |
| Read the owned product using the second admin session | 200; matching product |
| PUT the owned ID with changed name, price 23.45, stock 9, empty description/image URL | 200; changed fields persisted; omitted category preserved |
| POST valid product data without authentication | 401 |
| POST valid product data as an exploration-owned client | 403 |
| DELETE the owned product | Empty 204 |
| GET the deleted product | 404 |
| Repeat DELETE of the owned ID | Empty 404 |

Create requires name (3-100 characters), nonblank description (up to 1000),
price (0.01-99999999.99, up to two decimal places), nonnegative integer stock,
and nonblank category. Image URL is optional/null or HTTP(S)/empty.
PUT applies supplied non-null fields; omitted/null values preserve existing
values. Empty description/image URL are allowed. Product timestamps are server
local date/time strings without timezone offsets.

## Refresh and logout safety

Logout was exercised only on a newly registered disposable staging client.
With two sessions, logout returned empty 200; both current refresh tokens then
returned 401. Both original access JWTs still authenticated `/users/me` with 200.
The contract and backend source describe logout as account-wide refresh revocation.
Never use shared-admin logout as test teardown.

For that disposable client, refresh returned 200, replay of the consumed token
returned 401, its replacement still refreshed with 200, and the other session's
refresh token remained usable. Replacement usability after replay differs from
local source family revocation, matching the earlier
[awesome observation](2026-10-05-auth-jwt.md). The deployed cause is unresolved;
OpenAPI does not promise family revocation. This is not an assertion in the new
admin examples.

## Ownership, cleanup and limits

Only UUID-named exploration products and a fresh disposable client were mutated.
The owned product was deleted and an authenticated catalogue read confirmed no
products with this exploration's exact unique marker remained. Client teardown
returned 204 through its owner right-to-be-forgotten endpoint. Admin sessions were
left to expire; contexts were disposed. No shared admin account or seeded records
were changed. No credentials, tokens or raw account bodies were saved.

Deleting an unreferenced product worked after stock creation/adjustment. Backend
PostgreSQL migrations cascade inventory movements on product deletion, but cart
and order references can prevent deletion. Cart/order cleanup and checkout remain
deferred; this observation does not validate those dependencies or establish the
deployment's active database/profile. Future commerce scenarios must create users,
carts and products together on staging and remove references before products.

Daily resets are user-provided staging behavior; timing was not verified.
Tests create their own data each run, but a reset during execution can interrupt
them. The suite was only discovered during planning: 70 tests in 23 files;
the pre-existing suite was not executed during exploration.

A subsequent local transport-error probe with a placeholder token confirmed
Playwright errors can include Authorization headers. New admin requests and the
reused account fixture suppress raw transport errors; traces are disabled for
admin tests. No real token was used in that local probe.

## Reporting review and follow-up

Local review reproduced a gap: `safeRequest` sanitized the final error, but the
automatic GET step retained a placeholder Bearer header in HTML with tracing off.
The HTML report embeds ZIP data; searching its plain text alone misses that data.
No actual credentials/tokens were used in this reproduction.

The follow-up reporter runs before built-in reporters and replaces API-step
error details, including stack/snippet/cause/value. Two local probes covered an
expected failing wrapped request and a caught request failure. Both passed;
the decoded HTML contained three sanitized errors and no placeholder token.
The JSON report and result artifacts also contained no placeholder.
Artifacts: ignored `exploration-results/report-redaction/`.

With dotenv disabled and all API/admin environment variables absent, independent
discovery passed: 70 `api` tests and six `admin` tests. URLs use the agreed defaults;
credentials remain lazy and explicitly blank URLs still fail.
