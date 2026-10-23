# Requests using a deleted account's JWT can return 500

Observed on **23 October 2026** at `https://awesome.byst.re` during
[account lifecycle verification](exploration/2026-10-23-account-lifecycle.md)
and [password/email exploration](exploration/2026-10-23-password-email.md).

## Reproduction

1. Register and sign in to a disposable client account. Retain its access token
   in memory, and sign in to a separate disposable observer account.
2. Delete the target using
   `DELETE /api/v1/users/{username}/right-to-be-forgotten` with its own JWT.
   The observed response was `204` with an empty body.
3. Look up the target through `GET /api/v1/users/{username}` using the observer's
   JWT. The account lifecycle test observed `404`; the saved refresh token was
   also rejected with `401`.
4. Repeat the deletion request using the deleted account's retained access JWT.
   The first focused run's teardown observed **500**.
5. Separately, the exploration runner issued GET for a just-deleted account
   using that account's retained JWT and also observed **500**. It inspected
   only the status, not the error body.

Expected: a documented client/authentication error for a deleted principal or
absent target, rather than an internal server error. The saved OpenAPI declares
`401` and `404` for both operations, and `403` additionally for deletion. The
precise precedence of those responses needs confirmation; this report does not
assert that access JWTs must be revoked immediately after deletion.

The independent observer's `404` establishes account absence in the automated
case. A lookup with the deleted account's JWT does not independently establish
whether cleanup succeeded. Root cause and deployment revision are unconfirmed.

## Test impact and remaining coverage

Lifecycle teardown checks the target through an independently authenticated
observer, deletes it only when still present, and verifies absence afterward.
It must not interpret a failed sign-in as proof that an account is absent or
accept `500` as a successful delete response.

Repeated requests with a deleted account's JWT remain a reported application
defect outside the five selected account-lifecycle cases. No backend change or
passing regression assertion that accepts `500` was introduced.
