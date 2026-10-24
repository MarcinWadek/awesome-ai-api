# Fixture unification

Date: 24 October 2026.

Scope: review all six original fixtures and unify shared mechanisms after
completion of the saved REST matrix. This changes infrastructure rather than
endpoint coverage. No backend, secrets or shared account settings are changed.

## Changes

- One lazy, test-scoped client layer with inherited trace protection.
- Shared account registration, session validation, partial-setup recovery,
  bounded deletion-token renewal and cleanup error handling.
- Retained observer verification for lifecycle/MFA/commerce, MFA renewal and
  stock restoration before commerce account deletion.
- Commerce peer dependency ensures peer deletion before product cleanup;
  two specs no longer need manual peer-cart cleanup.
- Removed the redundant Ollama wrapper and shared identical JSON assertions.
- Added offline fault-injection checks, separate from operation coverage.

Current conventions: [Fixture conventions](../fixtures.md).

## Verification

Completed and verified on 24 October 2026:

| Check | Result |
| --- | --- |
| Offline fixture fault checks | 12/12 passed, 4 workers, 0 retries |
| Targeted live MFA/auth/lifecycle/cart/order/admin checks | 73/73 passed, 2.7 min, 4 workers, 0 retries |
| Full api/admin regression | 177/177 passed, 4.1 min, 4 workers, 0 retries |
| Typecheck, whitespace and local documentation links | Passed |
| Endpoint discovery | Unchanged: 177 tests in 57 files; 104 api / 73 admin |

The initial sandboxed live attempt failed because DNS returned ENOTFOUND. Both
configured hosts resolved outside the sandbox, where targeted and full live
verification passed. Diagnostic logs are gitignored under exploration-results/.

The full run verifies the existing REST behavior with the new fixture composition,
including peer-cart scenarios without test-managed cleanup. Offline checks inject
cleanup failures rather than intentionally leaving accounts on a live deployment.
Process interruption and sustained API outages remain cleanup limitations.

## Readability follow-up

Extracted local commerce helpers `cancelOwnedOrders`, `restoreOwnedInventory`
and `deleteOwnedProducts`, plus MFA's `renewSession`. Ownership, teardown order,
assertions and cleanup error collection remain with their owning fixtures.
No endpoint tests or additional helper framework were added.

Typechecking, whitespace and the existing 12 offline fixture checks passed.
All 66 targeted live commerce/MFA tests passed in 2.7 min with four workers and
zero retries. The full api/admin regression then passed 177/177 in 4.0 min,
also with four workers and zero retries. The helper extraction is verified.
