# Netlify Preview Fallback — Retired

**Status:** Retired on 24 September 2026.

KHLIM no longer uses Netlify as a deployment or preview target for this
repository. Vercel is the canonical deployment platform for the public/member
Web app, Admin app, and API.

The root `netlify.toml` intentionally sets the Netlify build ignore command to
exit successfully so Git-triggered Netlify builds are skipped. This keeps any
still-connected Netlify projects dormant while provider-side Git connections
are removed.

Do not use Netlify previews as acceptance evidence for KHLIM. Use the Vercel
deployment associated with the exact commit under review together with the
GitHub CI and Playwright acceptance gates.

If Netlify is ever reintroduced, treat that as an explicit architecture and
deployment decision rather than silently reenabling the previous fallback.
