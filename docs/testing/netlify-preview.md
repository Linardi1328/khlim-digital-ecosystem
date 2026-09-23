# Netlify Preview Fallback — Retired

**Status:** Retired on 24 September 2026.

KHLIM no longer uses Netlify as a deployment or preview target for this
repository. Vercel is the canonical deployment platform for the public/member
Web app, Admin app, and API.

The provider-side Netlify Git integration has been fully disconnected and
`netlify.toml` has been removed from the repository.

Do not use Netlify previews as acceptance evidence for KHLIM. Use the Vercel
deployment associated with the exact commit under review together with the
GitHub CI and Playwright acceptance gates.

If Netlify is ever reintroduced, treat that as an explicit architecture and
deployment decision rather than silently reenabling the previous fallback.
