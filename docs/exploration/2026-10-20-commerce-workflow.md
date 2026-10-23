# Commerce workflow exploration

Observed 20 October 2026 at `https://aitesters.byst.re` only. Sources:
`docs/api-docs.json`, live `/v3/api-docs`, backend OrderController/OrderService,
AdminInventoryController/InventoryService, CartService, UserService, repository
and migration V4. Existing product/cart coverage is credited in the
[root matrix](../../api-coverage-report.md). Raw runner/output: gitignored
`exploration-results/commerce.cjs` and `commerce-live.jsonl`.

Two ordinary UUID users and two admin-created UUID products (12.34/5, stock 7)
were used. No shared catalogue mutations, cross-host IDs/tokens, admin changes or
admin logout. Address: street/city/state/country nonblank, zipCode `35-119`.

| Probe | Contract/source expectation | Observed |
| --- | --- | --- |
| Inventory list by unique search/detail | 200, available quantity 7, IN_STOCK | Matched |
| Inventory list/detail/movements auth and client role | 401/403 | Matched |
| Missing inventory | 404 Product not found | Matched |
| Adjustment +2; identical request replay | 201; same movement, quantity 9 once | Matched |
| Changed replay; delta -100 | 409; no mutation | Matched |
| Delta zero | 400 validation | `deltaNonZero: delta must not be zero` |
| Empty checkout | 400 Cart is empty | Matched |
| Cart missing product/add and missing item/update | 404 Product not found / Cart item not found | Matched |
| Two products at quantity 2 | 200, totalItems 4, totalPrice 34.68 | Matched; peer cart empty |
| Blank street checkout; anonymous checkout | 400 / 401 | Matched |
| Checkout | 201 PENDING, exact address/items/prices/34.68 | Matched; cart empty; stock 9 → 7 |
| Owner orders filtered/paged; peer list | 200 owned row / empty page | Matched |
| Admin filtered orders; owner/admin detail | 200, own created row/details | Matched |
| Peer detail; peer cancel | 404 / 403 | Matched |
| Client status update | 403 | Matched with JSON string enum body |
| Admin PAID then owner cancel | 200 / 200 CANCELLED | Stock restored to 9 |
| Repeated cancellation | 400 Order cannot be cancelled in current status | No additional restoration |
| Reopen PENDING then status CANCELLED | 200 / 200 | Still stock 9; RESTORED marker prevents double restoration |
| Movement history | 200 newest first | INITIAL_STOCK +7, ADMIN_ADJUSTMENT +2, ORDER_DEDUCTED -2, ORDER_RESTORED +2; correct order IDs/actor/quantityAfter |
| Stock reduced to 1 after adding quantity 2; checkout | 409 Insufficient stock for product ID | Cart preserved; no second order |
| All order protected operations anonymous | 401 | Matched |
| Admin order list as client | 403 | Matched |
| Missing order detail/cancel/status | 404 Order not found | Matched |

Initial enum probe used a plain string without JSON Content-Type and received
401. Correcting the request to `application/json` with body `"PAID"` produced
the documented role/status behavior. This was a probe error, not an application
defect. Restricted-network connection failed before requests; approved access
completed exploration. No confirmed commerce defect in this batch.

Cleanup was defined before checkout: clear both carts (204), discover all owned
orders (including unparsed create responses), cancel before user deletion, forget
each disposable user (204), verify each order absent through admin detail (404),
delete exact-name products (204), verify inventory and movement endpoints absent
(404). All three exploratory runs completed cleanup, including the two interrupted
at the enum probe. User deletion removes orders but does not restore stock;
movement order foreign keys use SET NULL, product foreign keys CASCADE.

## Subsequent automated verification

The focused run passed **71/71** on 20 October (2.5m, four workers, zero retries):
60 additions plus 11 existing staging cart-item cases. This extends the manual
observations above with shipped/delivered cancellation rejection, both supported
cancellation entry points, inventory missing-resource cases, all three stock
classifications, invalid pagination/threshold, inventory pagination clamping,
cart peer isolation, zero-quantity removal and combined repeated-add stock limits.
Multi-product shortage checkout was atomic: no order/deduction, both cart items
preserved, available product stock unchanged. Cancellation and inventory tests
verified persisted movements, not just mutation responses.

Before permanent checkout specs were added, two temporary fault probes passed
**2/2** (19.0s, one worker, zero retries): assertion failure after checkout and
interrupted product-create parsing. Independent checks after fixture teardown
confirmed user/order/product/inventory/movement endpoint absence. The temporary
probe spec was removed. The fixture checks the deduction/restoration ledger sum
before deleting the shopper, restores adjustment baseline, then verifies order
absence after deletion and product/inventory absence after product deletion.

The initial order-only batch passed 31/33; two test-side pagination assertions
expected `message` where backend IllegalArgumentException handling returns
`error`. Corrected exact assertions passed in the combined run. No application
assertion was weakened. See [implementation record](../implementation/commerce-workflow-tests.md)
for full-suite results.

Remaining boundary: checkout's defensive product-disappeared 404 was not induced.
Cart/order product foreign keys prevent a supported safe deletion setup. Missing
resources were verified directly on cart, product, order and inventory operations.
No commerce operation is blocked; this defensive branch is unverified. Additional
syntactic validation permutations, overflow, changed-delta replay conflict
(changed-reason conflict is covered), concurrency and load remain deferred.

Full regression subsequently completed: **168 passed, 1 failed** (3.5m, four
workers, zero retries). All 94 staging/admin cases passed. The only failure was
the existing awesome traffic found-entry detail 500; commerce assertions and
teardown checks passed. Typecheck, tracked diff and new-file whitespace checks
passed. Backend/course sources and existing environment configuration were not
changed.
