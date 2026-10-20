# QR negotiation returns a misleading authentication error

Confirmed twice on 20 October 2026 at `https://awesome.byst.re`.
Evidence: [QR exploration](exploration/2026-10-20-qr-create.md).

1. Register a disposable client and sign in successfully.
2. POST `/api/v1/qr/create` with its valid Bearer token, JSON Content-Type,
   `Accept: application/json`, and `{"text":"https://example.invalid/qr-core"}`.
3. Repeat with the same token/body and `Accept: image/png, application/json`.
4. Forget the disposable account with its token (204).

Expected: a media negotiation rejection for the incompatible JSON-only Accept
(normally 406), followed by 200 PNG for compatible Accept. The contract and
controller declare PNG success; changing Accept must not invalidate a token.
Actual: JSON-only Accept returns 401 `{"message":"Unauthorized"}`; compatible
Accept returns 200 PNG. Blank text similarly returns 401 with JSON-only Accept
and the documented 400 field error with compatible Accept.

Root cause is unconfirmed. The QR client explicitly accepts both PNG and JSON;
the core tests do not assert this misleading 401 as desired negotiation behavior.
