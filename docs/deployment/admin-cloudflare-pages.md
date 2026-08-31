# Admin preview deployment on Cloudflare Pages

The KHLIM Admin app can be exported as a static Next.js site for isolated preview hosting on Cloudflare Pages. This keeps Admin previews independent from the Vercel Hobby deployment quota while preserving the existing Next.js/Vercel/runtime build path.

## Cloudflare Pages project

Create one Pages project dedicated to the Admin interface and connect it to `Linardi1328/khlim-digital-ecosystem`.

Use these build settings:

- Production branch: `main`
- Root directory: repository root
- Build command: `CLOUDFLARE_PAGES=1 pnpm --filter @khlim/admin build`
- Build output directory: `apps/admin/out`
- Node.js: `24`
- pnpm: `10.15.0`

Cloudflare should create preview deployments for non-production branches and pull requests. Keep the Pages project scoped to the Admin app; public-web previews continue on their own deployment target.

## Preview environment variables

For a safe UI-only preview, set:

- `NEXT_PUBLIC_ADMIN_DEMO_MODE=true`

For a connected staff preview, set the following Cloudflare Preview variables instead and keep demo mode disabled:

- `NEXT_PUBLIC_ADMIN_DEMO_MODE=false`
- `NEXT_PUBLIC_API_BASE_URL=<staging API base ending in /v1>`
- `NEXT_PUBLIC_SUPABASE_URL=<staging Supabase URL>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging Supabase anon key>`
- `NEXT_PUBLIC_KHLIM_ENV=staging`
- `NEXT_PUBLIC_SENTRY_DSN=<optional staging DSN>`

Never place database credentials, Supabase service-role keys, payment-provider secrets, webhook secrets, or other server credentials in the Pages environment. The Admin browser only needs public client configuration and talks to the API over HTTPS.

## Build behavior

`CLOUDFLARE_PAGES=1` changes only the Admin Next.js output mode:

- Cloudflare Pages: static `out/` export with directory-style routes and unoptimized Next images.
- Vercel: normal managed Next.js output.
- Local/container builds: existing `standalone` output.

The repository CI workflow `Admin Cloudflare Export` validates the Pages artifact without requiring Cloudflare account credentials or deploying anything.

## Acceptance before using a connected preview

Verify at minimum:

1. `/` loads the Admin shell.
2. `/audit`, `/settings`, `/insights`, and `/reports` load directly and on refresh.
3. Mobile navigation works at 320px and 390×844.
4. Demo mode is visibly marked when enabled.
5. With staging credentials, staff authentication redirects correctly and API requests use the configured staging API only.
6. No production secrets or production payment credentials are present in the Cloudflare project.
