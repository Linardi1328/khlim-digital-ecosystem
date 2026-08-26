# Environment contracts

KHLIM keeps development, staging, and production configuration isolated. These files are templates only and must never contain real credentials.

## Runtime versus deployment environment

`NODE_ENV` controls framework/runtime optimization and therefore stays within the conventional values `development`, `test`, or `production`.

`KHLIM_ENV` identifies the actual KHLIM deployment tier: `development`, `staging`, or `production`.

Staging intentionally uses:

```text
NODE_ENV=production
KHLIM_ENV=staging
```

This gives staging production-like framework behavior without confusing it with the real production environment.

## Rules

- development, staging, and production must use separate credentials and data stores;
- real secrets belong in provider/CI secret stores, never Git;
- production data must not be copied into local development by default;
- staging should use synthetic or deliberately approved test data;
- `NEXT_PUBLIC_*` values are public client configuration and must never contain secrets;
- deployment-specific values should be injected by Vercel, Railway, Supabase, GitHub Actions, or the approved hosting provider;
- a production or staging API process must run with `NODE_ENV=production`.

The root `.env.example` remains the local-development template. The staging and production templates document required keys only.
