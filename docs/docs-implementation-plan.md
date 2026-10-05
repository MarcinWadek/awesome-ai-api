# API Documentation Tests - Implementation Plan

**Status:** Implemented and validated
**Date:** 5 October 2026
**Targets:** `GET /v3/api-docs` and `GET /swagger-ui/index.html`

## Objective

Check the published documentation with small Playwright assertions. Verify the
required document fields and the authentication declarations for explicitly
listed public and protected operations. Verify that the Swagger UI HTML page
is available through a separate HTTP smoke test.

## Accepted simplification

The initial exhaustive contract approach was replaced with endpoint-level
assertions at the user's request. The tests no longer validate the operation
inventory, duplicate policy entries, arbitrary object shapes, security scope
values, or reference resolution. New endpoints do not automatically fail the
suite; add them to the reviewed endpoint lists when coverage is needed.

TypeScript types describe the fields used by these tests. They do not perform
runtime schema validation. These tests verify documentation declarations;
endpoint tests verify actual authentication enforcement.

## Files

| File | Responsibility |
| --- | --- |
| `types/openapi.ts` | Minimal document, operation, security, and endpoint types. |
| `support/assertions/openapi.ts` | Required-operation lookup, security inheritance, and two public assertion helpers. |
| `support/contracts/openapi-policy.ts` | Existing explicit lists of 10 public and 43 protected operations. |
| `tests/api/docs/documentation.spec.ts` | Response, document fields, scheme definition, and endpoint security checks. |
| `tests/api/docs/swagger-ui.spec.ts` | Swagger UI availability, HTML Content-Type, and body marker checks. |

## Test structure

The two OpenAPI tests are grouped under `GET /v3/api-docs` and `200`, following
the ascending response-code convention. Each test fetches and parses its own response.

1. Assert HTTP 200, JSON Content-Type, parseable JSON, an OpenAPI version starting
   with `3.`, a nonempty `info.title`, and POST operations for signin and forgot password.
2. Assert HTTP 200, JSON Content-Type, parse the document, verify the `bearerAuth`
   HTTP bearer scheme, and apply the appropriate assertion to every listed endpoint.

Reuse `expectJsonResponse` and `expectNonEmptyString` from the existing HTTP helpers.
Use the configured Playwright request fixture without adding authentication.

The separate Swagger UI smoke test is grouped under `GET /swagger-ui/index.html`
and `200`. It uses the same request fixture with `Accept: text/html` and checks:

1. HTTP status is exactly `200`.
2. The Content-Type header contains `text/html`.
3. The response body, read with `response.text()`, contains `Swagger UI`.

This is an HTTP availability check. Browser rendering, JavaScript execution,
and UI interactions are outside its scope.

## Assertion behavior

- `getRequiredOperation` looks up the endpoint and fails with its method and path
  if it is absent.
- `effectiveSecurity` returns `operation.security ?? document.security ?? []`.
  An explicit empty array overrides global requirements.
- `expectBearerRequired` requires a nonempty security array and `bearerAuth` in
  every alternative. An anonymous or non-bearer alternative fails this assertion.
- `expectAnonymousAccess` accepts an empty security array or an empty requirement
  object, including optional bearer authentication.

## Validation

Run the documentation tests first, then the whole suite and TypeScript check:

```powershell
npm.cmd run test:api -- tests/api/docs
npm.cmd test
npm.cmd run typecheck
```

`npm.cmd` avoids PowerShell's blocked `npm.ps1` launcher. Live tests require
network access and the repository's existing environment configuration.

Latest validation after adding the Swagger UI smoke test:

- New Swagger UI test: **1 passed**.
- Whole suite, run after the new test passed: **11 passed**, including both
  OpenAPI documentation tests and the Swagger UI test.
- TypeScript check: **passed**.
