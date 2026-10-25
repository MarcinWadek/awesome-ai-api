# Contributor guide

After [setup](../README.md), read the [profile spec](../tests/api/users/me.get.spec.ts)
or [checkout workflow](../tests/admin/orders/index.post.spec.ts).
[Coverage](../api-coverage-report.md) lists checks/gaps;
[Bug reports](bug-reports.md) records unexpected behavior.

## Where changes belong

| Location | Responsibility |
| --- | --- |
| [tests/api](../tests/api), [tests/admin](../tests/admin) | API-host and staging-host scenarios; staging includes ordinary shoppers |
| [clients](../clients), [types](../types) | HTTP methods and request/response types |
| [fixtures](../fixtures) | Inject clients and own account/resource lifecycles |
| [generators](../generators) | Unique registration data; override fields for validation cases |
| [support](../support) | Assertions, configuration, SSE/TOTP helpers and error redaction |

Types need runtime assertions. Check status, headers, fields and persistence;
reuse existing helpers.

## Choose the fixture

Import `test` and `expect` from the narrowest suitable entry point:

| Fixture | Use when |
| --- | --- |
| [clients](../fixtures/clients.fixture.ts) | Anonymous requests or explicit configured-account login |
| [auth](../fixtures/auth.fixture.ts) | A fresh ordinary account; optional `authenticatedPeer` for isolation |
| [admin](../fixtures/admin.fixture.ts) | Staging administrator access; origin is guarded to `https://aitesters.byst.re` |
| [account lifecycle](../fixtures/account-lifecycle.fixture.ts) | The scenario deletes its account; an observer verifies absence |
| [MFA](../fixtures/mfa.fixture.ts) | Enrollment, second-factor login or recovery |
| [commerce](../fixtures/commerce.fixture.ts) | Owned shoppers/products/orders and stock restoration |

Clients and resources are lazy and test-scoped. Inject clients in test callbacks;
keep scenario-specific preparation visible in the test or setup hook.

## Add or change a test

1. Check the [saved OpenAPI contract](api-docs.json), existing specs and target
   behavior. Backend source can explain behavior but does not prove deployment state.
2. Select success, authentication and meaningful negative cases. Add boundaries
   and ownership checks for distinct risks.
3. Use one `METHOD /path` describe, a method-bearing filename and flat
   `status: behavior` names ordered by response code. Separate preparation,
   request and assertions with `// Given`, `// When`, `// Then`; omit empty sections.
   Reserve `test.step` for useful workflow/lifecycle groups.
4. Verify persistence/state preservation. Report defects without weakening
   assertions, skipping or adding retries.
5. Run affected tests first, then the full api/admin suite for behavioral changes.
   Run fixture checks for lifecycle changes, typecheck and whitespace checks.
   Update coverage with dated outcomes/gaps. Documentation edits need link/content
   checks. Record blocked execution honestly.

## Own data through teardown

- Keep tokens, users and IDs within one environment. Use generated identities
  and owned products; never modify, log out or delete the shared administrator.
- Ordinary auth owns account deletion. Use specialized fixtures if changing
  credentials, enabling MFA or deleting the account inside the test.
- Commerce clears carts, cancels orders and restores stock before account
  deletion; products follow account/order removal. Preserve dependent data and
  report failures if restoration fails. Do not bypass this order.
- Recover resources after lost responses using unique names; verify cleanup after
  setup/assertion failures. Signup retention and interruption remain limits.
  MFA renewal requires fresh TOTP windows, not fixed sleeps.
- Traces stay off. Keep the redaction reporter first, including CLI overrides;
  never log/attach credentials or enable request debug output.

## AI checks

[Ollama specs](../tests/api/ollama) exercise deterministic mock scenarios. They
verify SSE framing, reconstructed text, tool schemas/results and the final
assistant phase. Consume the whole stream: intermediate `done` events do not
end a tool workflow. See [SSE parsing](../support/sse.ts) and
[tool assertions](../support/assertions/ollama-tools.ts).

Exact mock prose checks transport expectations, not real-model quality or
grounding. Buffered responses do not measure token latency. Mutable price/stock
comparisons require isolated data; the known mock/prose mismatch is in Bug reports.

## How the framework evolved

Development moved from contract exploration and authentication to reusable
fixtures, AI integration, staging CRUD, commerce and MFA. Review then reduced
repetitive cases and unified clients, cleanup and test style.

Parallel work included two GPT-6 Luna subagents on 23 October 2026: account-lifecycle
implementation and password/email exploration. Parent review corrected and
verified their output. Earlier workstreams were plans; MFA and email/SSO were
direct deliveries. Agree interfaces/file ownership before delegating, then
integrate and verify. Concurrent workers need isolated data. Detailed records
are in the [history tag](../README.md#history).
