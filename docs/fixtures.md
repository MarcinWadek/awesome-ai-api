# Fixture conventions

Fixtures follow one pattern: clients are lazy and test-scoped; an owning fixture
prepares disposable data, yields it, and cleans it up. Dependencies keep clients,
observers and parent resources alive until teardown ends. No fixture modifies the
shared admin account or persists authentication state.

## Layers

| Layer | Responsibility |
| --- | --- |
| `clients.fixture.ts` | Construct scenario clients from Playwright's test-scoped request, without login/data creation. Disable traces for derived fixtures. |
| `auth.fixture.ts` | Supply independent ordinary accounts through authenticatedUser and authenticatedPeer. |
| `admin.fixture.ts` | Sign in the configured shared staging admin, retaining the host guard. Never delete or log out this account. |
| `account-lifecycle.fixture.ts` | Supply an account the test may delete, with an independent observer that outlives it. |
| `mfa.fixture.ts` | Add pending/enrolled MFA state and MFA-aware token renewal to the shared account lifecycle. |
| `commerce.fixture.ts` | Own the shopper, products, orders and stock restoration; compose the shared clients and account lifecycle. |

Ollama tests import auth.fixture.ts directly and inherit ollamaClient from the
client layer. Endpoint specs inject clients from the same layer; beforeEach
hooks prepare scenario data rather than reconstructing clients. Email, QR and
traffic clients are available alongside the existing domain clients.

## Shared account lifecycle

support/registered-user.ts implements registration, sign-in, token validation,
cleanup recovery and error reporting once. The owner calls useRegisteredUser
with its clients and Playwright's use callback.

- Remember generated credentials before signup, and attempt recovery even after
  signup throws or returns an unexpected status.
- Retain the access token before validating the remaining session fields.
- Delete with the current token. On a 401 deletion response, renew and retry once.
  MFA renews through its retained authenticator; ordinary accounts use login.
- Require 204 on deletion. Lifecycle, MFA and commerce supply an existing observer
  to verify 404 independently and tolerate accounts already deleted by the test.
  Ordinary auth avoids creating another account solely for observation.
- An unconfirmed signup followed by 401 login has no authenticated cleanup route
  unless an observer establishes presence. Process termination or an API outage
  can still leave data behind.
- Preserve setup/consumer errors alongside cleanup errors. Playwright separately
  records failures in the test body and fixture teardown.

The specialized hooks have concrete uses: MFA supplies renewToken, and commerce
supplies beforeDelete to restore stock before account deletion removes orders.
There is no global cleanup registry.

## Commerce teardown order

The commerce authenticatedPeer depends on commerce. It stays lazy, but when used
its account deletion removes cart references before commerce product cleanup.
Specs need no manual peer-cart cleanup blocks.

Commerce clears the shopper cart, cancels orders and verifies/restores owned
stock. Only then does shared account cleanup delete the shopper. Product cleanup
verifies shopper/order absence, removes owned products, and checks their inventory
resources are absent. Inventory cleanup failure preserves shopper/orders/products;
independent product failures are collected so other products still get cleanup.

Commerce keeps these operations in local helpers: `cancelOwnedOrders`,
`restoreOwnedInventory` and `deleteOwnedProducts`. `restoreShopperData` orders
cancellation and restoration before account deletion; product deletion follows
account cleanup. MFA passes its local `renewSession` helper
to the shared account lifecycle, keeping password and TOTP renewal together.
These helpers retain the owning fixture's test-scoped state.

## Verification

npm run test:fixtures runs offline fault-injection checks through
playwright.fixtures.config.ts. They cover account recovery, token renewal,
deletion verification and cleanup failures, separately from REST coverage.
After changes, run affected live scenarios, then the full api/admin suite,
typechecking and whitespace checks.
