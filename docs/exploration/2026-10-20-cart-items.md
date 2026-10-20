# Cart item exploration

Observed on **20 October 2026**, exclusively at `https://aitesters.byst.re`.
Sources: live `/v3/api-docs`, `docs/api-docs.json`, and the read-only backend
`CartItemsController`, cart DTOs, `CartService` and `CartExceptionHandler`.
Earlier cart read/clear evidence covers a different host:
[6 October exploration](2026-10-06-users-cart.md).

Each of eleven probes registered its own staging client and created a UUID-named
product through the staging administrator: price `12.34`, stock `7`. Only the
regular client's token was used for authenticated cart operations. PUT and
successful/anonymous DELETE started with quantity `2`; absent DELETE used an
existing owned product never added to that user's empty cart.

| Operation / request | Contract expectation | Live result and subsequent GET /cart |
| --- | --- | --- |
| POST item, quantity 2 | 200 CartDto | 200; exactly the owned product at quantity 2, totalItems 2, totalPrice 24.68 |
| POST item, quantity 0 | 400; minimum 1 | 400 `{"quantity":"must be greater than or equal to 1"}`; cart empty |
| POST item, valid body without Authorization | 401 | 401 `{"message":"Unauthorized"}`; cart empty |
| POST item, quantity 8 against stock 7 | 409 | 409 `{"message":"Insufficient stock for product <owned-id>"}`; cart empty |
| PUT item, quantity 3 | 200; replace quantity | 200; quantity 3 (not 5), totalItems 3, totalPrice 37.02 |
| PUT item, quantity -1 | 400; minimum 0 | 400 `{"quantity":"Quantity cannot be negative"}`; quantity 2 and totals preserved |
| PUT item, valid body without Authorization | 401 | 401 `{"message":"Unauthorized"}`; quantity 2 and totals preserved |
| PUT item, quantity 8 against stock 7 | 409 | 409 same stock-error format; quantity 2 and totals preserved |
| DELETE present item | 200 CartDto | 200 empty cart; persisted empty cart and zero totals |
| DELETE present item without Authorization | 401 | 401 `{"message":"Unauthorized"}`; quantity 2 and totals preserved |
| DELETE existing product absent from cart | 404 | 404 `{"message":"Cart item not found"}`; cart remains empty |

All responses above were JSON. Successful cart responses identified the generated
owner and contained only productId/quantity item fields. Product reads after each
successful mutation still reported stock `7`: cart operations do not reserve stock.
Live operation statuses and DTO constraints match the checked-in OpenAPI contract.
PUT zero is documented as removal and is valid; negative quantity is the selected
invalid PUT case. No application defects or changes to the requested scope found.

Cleanup completed for all eleven probes: cart clear `204`, owned product deletion
`204`, then generated user's right-to-be-forgotten `204`. The shared administrator
was only signed in and used for product creation/deletion (plus catalogue reads
for cleanup); it was never logged out, modified or deleted. No data or tokens
crossed environments. Initial restricted-network execution could not reach the
docs endpoint; the successful run used approved network access. The ad hoc runner
is gitignored at `exploration-results/cart-items.cjs`; it prints selected results,
never credentials, login payloads, tokens or administrator responses.

Deferred: repeated POST accumulation/combined-stock limits, missing product POST,
missing item PUT, PUT zero removal, additional quantity boundaries, concurrent
mutations and cross-user isolation. Automation adds a retained-item check to the
DELETE success case to distinguish selective removal from whole-cart clearing.
See the [implementation plan](../implementation/cart-item-tests.md) and
[current root plan](../../api-test-plan.md).
