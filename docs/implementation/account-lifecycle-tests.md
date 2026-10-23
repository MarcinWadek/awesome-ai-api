# Account lifecycle and email-event tests

**Status:** completed, 23 October 2026. This record preserves the original
focused verification; current suite status is maintained in the
[API coverage report](../../api-coverage-report.md).

## Subagent attribution

This delivery used two **GPT-6 Luna subagents with high reasoning effort**:

- `account_lifecycle` implemented the five account lifecycle tests, the dedicated
  fixture and client changes, and the associated records; it ran focused verification.
- `password_email_exploration` explored password/email contracts and runtime
  behavior, documented token/sink dependencies, and produced the
  [password/email exploration report](../exploration/2026-10-23-password-email.md).
  It added no permanent regression tests.

The parent agent coordinated scope and file ownership, reviewed both deliveries,
required corrections to cleanup and exploratory evidence, integrated documentation,
and ran the final focused tests and full 153-test regression suite.

## Scope

Added focused API coverage for `DELETE /api/v1/users/{username}/right-to-be-forgotten` and `GET /api/v1/users/me/email-events`. Five tests were selected:

- Deletion returns 204 with no body, an independently authenticated observer receives 404 for the deleted profile, and the deleted user's saved refresh token is rejected.
- Deletion without authentication returns 401.
- A client cannot delete a peer (403), and the peer remains readable by an independent observer.
- A fresh account receives an empty email-event array (200).
- Email-event read without authentication returns 401.

## Setup and cleanup

Use disposable users on the `api` project. Add a dedicated lifecycle fixture whose teardown tolerates an account already removed by the operation under test and verifies that the generated identity is absent. Keep the existing auth fixture unchanged. The deletion case uses a second registered account to verify absence independently. Do not create orders or seed unrelated resources.

Initialize endpoint clients in each spec's setup, use Given/When/Then `test.step` labels, and keep expected response codes in ascending order. Disable traces for these credential-bearing lifecycle tests; use the configured redacting reporter.

## Evidence and deferred coverage

The saved OpenAPI contract declares 204/401/403/404 for deletion and 200/401 for email-event reads. Backend source and endpoint tests establish owner-only client deletion, 204 success, refresh/reset-token and owned-record cleanup, and current-user email-event scoping. Live behavior on the awesome API target is recorded in [the exploration report](../exploration/2026-10-23-account-lifecycle.md).

Email events will be checked only for a fresh account's empty result and missing authentication. Event creation/isolation, admin deletion, nonexistent targets, and assertions for every deleted record type are deferred. The automated success case establishes profile absence and refresh-token revocation; it will not claim full cascade cleanup through the public API.

## Required changes and verification

Add one deletion-aware fixture, the two endpoint specs, any narrowly required client method or response type, and the linked exploration/implementation records. Run the five new tests with `--retries=0` in the `api` project using the repository reporters, then run typecheck and `git diff --check`. The parent task owns integration into `api-coverage-report.md` and the full-suite regression run.

## Delivery results

Added a deletion-aware fixture that depends on the existing authenticated user
as an independent observer. Teardown checks the target's profile through that
observer, deletes only when the profile is present, and verifies 404 afterward.
Parent review also requires a 204 deletion response whenever cleanup deletes a
surviving target; absence alone does not make an unexpected 500 acceptable.
The existing authentication fixture remains unchanged. Added an email-events
client method and one spec per operation.

The focused command
`npx.cmd playwright test tests/api/users/right-to-be-forgotten.delete.spec.ts tests/api/users/me.email-events.get.spec.ts --project=api --workers=2 --retries=0`
passed **5/5 tests** on 23 October 2026 (subagent run: 9.3s;
parent rerun after final review changes: **9.6s**). `npm.cmd run typecheck` passed and
`git diff --check` was clean. The first focused run's three behavior assertions
passed, but teardown repeated DELETE after owner deletion and received 500.
The fixture was corrected to use independent observer confirmation; the final
run passed all five tests and cleanup. The repeat-delete defect is detailed in
the [deleted-account JWT bug report](../deleted-account-jwt-bug-report.md).

Parent integration review corrected the cleanup response assertion and a peer
step label, then reran the new cases first (**5/5 passed**, 9.6s). The subsequent
full regression passed **153/153** in **2.9 minutes**, with four workers and zero
retries (**80 api / 73 admin**), using:

```powershell
npm.cmd test -- --project=api --project=admin --workers=4 --retries=0
```

Parent typecheck, operation-matrix reconciliation, local Markdown link checks
and `git diff --check` passed. Public API assertions prove profile absence and
refresh-token rejection, not every owned-record cascade. Nonempty email-event
isolation and other deletion response boundaries remain deferred. Password/email
exploration added no regression tests and does not increase the coverage count.
