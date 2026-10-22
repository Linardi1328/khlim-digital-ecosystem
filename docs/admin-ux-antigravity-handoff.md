# Antigravity frontend handoff — KHLIM Admin clarity and speed

**Owner:** Antigravity (frontend only). **Target:** separate Admin UI branch after reviewing the API snapshot PR. **Do not edit:** database schemas, API authorization, RLS, Supabase roles, Vercel environment variables, or backend business logic. Keep the existing locked development workflow and test gates.

## Purpose
Make the Admin Console's 21 sidebar destinations understandable to first-time KHLIM staff and make the dashboard feel faster without showing stale sensitive data as authoritative. Use [the page-by-page staff guide](../admin-operations-guide.md) as the content source, but validate actual UI functionality before claiming an action is supported.

## Existing backend/API contract (pending separate PR)
`GET /v1/admin/dashboard-snapshot` — authenticated staff role + AAL2 required. Example:
```json
{
  "overview": {
    "organizationId": "org-id",
    "activeMembers": 0,
    "pendingMemberships": 0,
    "totalAthletes": 0,
    "openOfferings": 0,
    "capacityUtilisationRate": 0,
    "paymentsAttentionCount": null,
    "generatedAt": "ISO timestamp"
  },
  "leadSummary": null
}
```
For SUPER_ADMIN/MANAGEMENT/ACADEMY_ADMIN with organization context, `leadSummary` is the existing `GET /admin/academy/leads/summary` shape. For other staff roles it is `null`, enforced by backend. Never interpret `null` as zero. Do not call the endpoint before the new backend is deployed/verified. Fallback to current two-endpoint behavior while rolling out.

## Dashboard performance
- Replace two concurrent browser requests (overview, lead summary) with one role-scoped snapshot request, *after the new API endpoint is deployed*. Keep API type in shared client contracts.
- No sequential fetch waterfall after the authenticated session is ready. Deduplicate simultaneous requests and cancel outdated fetches when leaving the page.
- Render skeletons immediately. Show last successful in-memory **same-session and same-organization** non-sensitive aggregates as labelled `Last updated ...` while revalidating, but do not persist personal leads, tokens or sensitive operations to localStorage/IndexedDB. Clear on logout, account switch, org switch and role change.
- Always revalidate authoritative counts after lead/membership/offerings mutations. Never permit a stale summary to authorize enrolment, permissions, capacity holds or payments.
- Show an explicit `Refresh` action with loading state and a refresh timestamp, and a recoverable error with retry. Never fabricate counts.
- Instrument count of API requests, page load-to-useful-content, cold/warm p75, poor-network and error rate with existing PostHog consent/privacy rules and server logs. Record baseline first; target one summary HTTP request instead of two after session, and a measurable warm-load improvement rather than unproven percentages.

## Information architecture and page help
- Preserve existing 21 routes and RBAC. Group nav visually by workflow (Overview/Reports, Academy Setup, People/Operations, Content/Communication, Security/Settings) without changing URL semantics or access controls.
- Provide a discoverable `? About this page` affordance at the top of **every** page, with: purpose, what the numbers mean, 2–4 safe steps, common gotcha, and role permissions. Use an accessible drawer or collapsible panel; no massive permanent instructional blocks.
- Add an optional `New staff? Start here` guide entry from the sidebar/help menu linking to the staff guide or an in-app equivalent. Do not expose sensitive records in examples.
- Mark work in progress or backend-unavailable features clearly; do not render demo/synthetic metrics under a live badge.
- Keep page headings, breadcrumbs and correct active nav state (especially `/insights` vs `/insights/campaigns`), accessible focus/keyboard navigation, and descriptive action buttons.
- For all 21 pages, standardize layout spacing, tables, responsive overflow, text size, filter layout, loading skeletons, empty state and actionable errors. Maintain existing KHLIM visual identity; use screenshot iteration at desktop, tablet and mobile.

## High-priority workflow polish (after baseline)
1. **Leads:** search, date/campaign/status filters, detail, WhatsApp follow-up affordance, status save confirmation, concurrency conflict/reload explanation.
2. **3x3 Campaign:** clear separation between verified database leads and PostHog opt-in traffic; `CONFIG_REQUIRED` means unavailable, not zero. Date-range bounds and definition tooltips.
3. **Dashboard:** quick actions ordered by day-to-day frequency, live snapshot freshness and no duplicate requests.
4. **Offerings / Plans / Memberships:** make distinctions obvious in context help, and show authoritative status/capacity/pricing.
5. **Security pages:** role restrictions, sensitive-action confirmations and explicit audit trail messaging.

## Acceptance gates
- Desktop (1440px), tablet (~768px), mobile (~390px) screenshots reviewed with Playwright; no horizontal overflow or clipped primary actions.
- Every one of the 21 routes has page-specific purpose, safe steps and permission guidance; help is keyboard/screen-reader accessible.
- E2E checks: AAL2 Academy Admin sees leads, Event Staff cannot; unauthorized pages are protected **by API**, not only hidden nav.
- Dashboard: one snapshot HTTP request after authenticated session; no accidental double fetching in normal production navigation. Baseline and after numbers provided for cold, warm and slow network.
- Admin login, MFA, lead status update, payments and role-management regression tests pass, alongside lint/typecheck/build and CodeRabbit. No launch without human visual acceptance.
- Frontend is not to be merged into production until backend endpoint is live or feature-flagged fallback is verified.

**Separate later work:** Public Web gallery uniform 4:3 card frames remains its own Antigravity frontend polish change, not part of Admin release.
