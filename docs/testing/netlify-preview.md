# Netlify Preview Fallback

Netlify is a secondary preview host for the KHLIM web client. It exists so manual acceptance testing does not depend on Vercel preview capacity. Vercel remains supported; this is not a production migration.

## Scope

- Deploy `apps/web` only.
- Use the repository root as the monorepo/workspace root so pnpm can resolve shared packages.
- Use `apps/web` as the Netlify package directory.
- Use a Preview/Deploy Preview context, not the production site, for acceptance testing.
- Point the web preview only at staging/sandbox API, Supabase, and payment environments.
- Always create or refresh the preview from the exact PR head under review; do not accept a stale deployment from an earlier commit.

The web Next.js config treats both `VERCEL` and `NETLIFY` as managed Next.js hosts. Local/container builds continue to emit the standalone server output used by runtime CI.

## Suggested Netlify project setup

1. Import `Linardi1328/khlim-digital-ecosystem` from GitHub.
2. Keep the repository root as the base/workspace directory.
3. Set the package directory to `apps/web`.
4. Allow Netlify's Next.js/OpenNext integration to detect the app.
5. If a build command must be entered explicitly, use `pnpm --filter @khlim/web build` from the repository root.
6. Enable Deploy Previews for pull requests.
7. Do not configure a production alias during the acceptance phase.

## Preview environment variables

Configure these in Netlify's Preview/Deploy Preview environment. Never commit real credentials to the repository.

- `NEXT_PUBLIC_KHLIM_ENV=staging`
- `NEXT_PUBLIC_API_BASE_URL=<staging API base ending in /v1>`
- `NEXT_PUBLIC_CONTACT_EMAIL=<approved academy contact address, if available>`
- `NEXT_PUBLIC_SUPABASE_URL=<staging Supabase project URL>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging Supabase anon key>`
- `NEXT_PUBLIC_SENTRY_DSN=<optional staging DSN>`

Billplz secrets and webhook signing keys remain backend-only. The web preview must never receive provider secret keys.

## Acceptance boundary

Before using a Netlify preview for manual feature walkthrough testing, verify:

1. The deployment is associated with the exact PR/head commit being reviewed.
2. The homepage and public routes return successfully.
3. Auth pages load with the staging Supabase configuration.
4. Programme discovery reaches the staging API.
5. The selected locale persists while navigating public, auth, enrolment, legal, editorial, and portal pages.
6. No page exposes raw translation keys or unexpected English product copy after switching to another supported locale.
7. Enrolment still hands payment checkout to the configured provider and never renders KHLIM-owned card/CVV fields.
8. The parent portal requires authenticated access and remains relationship-scoped.
9. Browser console/network errors are recorded as acceptance defects rather than ignored.

A successful Netlify build is not by itself staging acceptance. The same manual Guardian/Admin integration walkthrough and payment-webhook invariants still apply.
