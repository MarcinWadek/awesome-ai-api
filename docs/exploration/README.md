# API exploration reports

These reports preserve live API observations and the evidence used to choose
automated coverage. Their dates describe when behavior was checked; historical
findings do not guarantee the current deployment behaves identically.

| Date | Scope | Report |
| --- | --- | --- |
| 2026-10-04 | Signup responses, validation and cleanup | [Users signup](2026-10-04-users-signup.md) |
| 2026-10-05 | JWT access, authorization and refresh rotation | [JWT authentication](2026-10-05-auth-jwt.md) |
| 2026-10-06 | Traffic, product reads and user prompts | [Traffic, products and prompts](2026-10-06-traffic-products-prompts.md) |
| 2026-10-06 | User list/lookup and cart read/clear | [Users and cart](2026-10-06-users-cart.md) |
| 2026-10-07 | Backend/mock source review, parallel dependencies and 59-test baseline rerun | [Parallel delivery review](2026-10-07-parallel-delivery.md) |
| 2026-10-11 | Ollama definitions, generation/chat SSE, tool iterations, validation and JWT | [Ollama endpoints](2026-10-11-ollama.md) |
| 2026-10-12 | Concurrent admin sessions, product mutations, owned cleanup and report redaction | [Admin and products](2026-10-12-admin-products.md) |

Use `YYYY-MM-DD-<scope>.md` with a short lowercase, hyphen-separated scope.
For one operation, include its area and operation, such as
`2026-10-04-users-signup.md`; use a combined scope for a related batch.
Create a new dated report for a later exploration and link the earlier evidence.
Extend the same report for follow-up probes of the same scope on the same day.

Each report should record the date, environment, operations and contract sources;
request conditions and expected versus observed results; isolated setup and cleanup;
and any defects, untested areas or implications for focused automation. Include
enough request detail to reproduce an unusual result without recording credentials,
tokens or unrelated account data. Add the report to this index and link it from
the affected API test plans. Keep separate bug reports linked to their evidence.

The Markdown report is the durable record. Raw responses and ad hoc runners stay
in the gitignored `exploration-results/` directory; record artifact references
only when they exist. Findings may cover more cases than the automated core suite.

Related documentation: [API testing workflow](../api-testing-workflow.md),
[root test plan](../../api-test-plan.md), and
[prompt defects](../prompt-bug-report.md).
