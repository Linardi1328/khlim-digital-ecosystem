# PR29 Payment Hardening Acceptance

This tranche makes settled payments monotonic and gives staff a controlled way to release abandoned checkout holds.

## State-ordering rules

- A persisted `PAID` payment is terminal for provider success/failure callbacks.
- Distinct stale failure events cannot regress a paid payment or active membership.
- Repeated success events preserve the original settlement and membership activation timestamps.
- A provider payment identifier mismatch is held as `ACTION_REQUIRED`.
- A normalized provider amount/currency mismatch is held as `ACTION_REQUIRED`.
- `REFUNDED` and `CANCELLED` states require manual review rather than automatic provider mutation.

## Abandoned checkout holds

`PAYMENT_CHECKOUT_HOLD_MINUTES` controls checkout hold expiry (default 45 minutes, allowed 5–1440). Staff with `SUPER_ADMIN`, `FINANCE_ADMIN`, or `MANAGEMENT` plus MFA can call `POST /v1/admin/billing/reconcile-stale-checkouts` to expire old processing checkouts. The payment, installment, schedule, and still-pending membership are cancelled together so programme capacity is released.

## Verification

The development acceptance run applies the real Prisma migrations to PostgreSQL, runs the root regression suite, lint/format checks, builds the API, and executes the real payment webhook/PostgreSQL integration suite including stale-event, provider-identity, amount/currency, and checkout-expiry cases.
