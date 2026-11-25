# V1 media privacy and deferred API release gates

Status: implemented in the repository. Nothing hosted has been changed, deployed,
provisioned or activated.

## 1. Youth media privacy

### Classification

The authoritative record is the "2026-11-25 Youth media privacy remediation"
section of `media/RIGHTS-MANIFEST.md`. In summary:

- **Kept (documented public-approved, no minors):** brand marks, adult coach
  portraits, the three KHero illustrations, `khlim/logo-*` and `khlim/coach-*`,
  and the web root Academy logo.
- **Removed (restricted):** 32 photographs of identifiable minors. These are
  `media/achievements/*`, `media/home/*` and the three `media/khlim` team and
  training photographs. Director website authorization exists for them, but no
  documented guardian publication consent does.
- **Removed (unverified):** `media/khero/coming-soon.webp`.
- **Owner decision:** `apps/admin/public/khs-academy-logo.webp` is a logo with no
  people and is used by the staff console. It is retained and flagged as
  unverified in the allowlist.

### Controls in the repository

| Control                                                                                                                                                                                                                                                    | Where                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Restricted files are absent from every deployable `public/` tree, so there is no direct HTTP access to them from a new build                                                                                                                               | removed with `git rm`                                                                 |
| Every served image or video must be allowlisted by exact path and SHA-256 with a rights basis; any unlisted file fails CI                                                                                                                                  | `tests/public-media-allowlist.test.mjs`                                               |
| Rendering a youth image requires `photoRightsVerified`, the deployment flag and an `APPROVED_YOUTH_MEDIA` entry for that exact URL (with a non-blank consent reference, the `website` channel and an unexpired `reviewBy`). The flag alone renders nothing | `canRenderYouthMedia` / `isApprovedYouthMedia` in `apps/web/lib/editorial-content.ts` |
| Components use the shared gate, not the browser flag                                                                                                                                                                                                       | achievements, player spotlight and spotlight article components                       |
| The dev-only preview media route already returns 403 in production (existing control, unchanged)                                                                                                                                                           | `apps/web/app/api/preview-media/[...path]/route.ts`                                   |

`APPROVED_YOUTH_MEDIA` is empty. When a consent exists, the image must be served
from approved private or access-controlled storage, not from `apps/web/public`,
because the allowlist test forbids youth media there.

### Hosted and owner actions (not performed)

1. Remove or restrict previous Vercel preview and production deployments, which
   still serve the old files at their deployment URLs.
2. After the fixed build is live, purge the CDN and `/_next/image` caches for the
   removed paths.
3. The repository was public when reviewed and its history contains the binaries.
   Restrict repository access promptly, assess clones, forks, historical commits
   and published artifacts, and plan authorized history remediation where needed
   (the ruleset currently blocks a rewrite). Request GitHub Support cached-view
   cleanup separately after access restriction or history remediation; a cache
   purge alone does not restrict Git history or recall downloaded copies.
4. Takedown handling: confirm removal across the live site, previous deployments
   and caches. Record the outcome privately, not in this repository.
5. Provision private storage only when a specific consent exists.

## 2. Server-authoritative deferred feature gates

### Audit result

Before this change there was no server-side launch gate for these features. The
only gates were the browser flags `NEXT_PUBLIC_ENABLE_V1_ENROLMENT` and
`NEXT_PUBLIC_ENABLE_V1_PORTAL`. As a result, a guardian could create a paid
membership and start a Billplz checkout by calling the API directly.

### Gate

`@RequireLaunchedFeature(feature, { staffBypass })` is evaluated by the global
`AuthorizationGuard`:

- It runs after authentication, so unauthenticated callers still get 401.
- It runs before the role, MFA and athlete-access database checks.
- A feature is on only when `KHLIM_ENABLE_V1_ENROLMENT` or `KHLIM_ENABLE_V1_PORTAL`
  is exactly `1`. Unset, `0`, `true` or a padded value all keep it closed.
- `NEXT_PUBLIC_*` values are never read.
- When the gate is closed, the response is:

  ```json
  { "statusCode": 403, "code": "FEATURE_NOT_AVAILABLE", "feature": "V1_ENROLMENT" | "V1_PORTAL", "message": "This feature is not available yet" }
  ```

`staffBypass` admits `SUPER_ADMIN`, `MANAGEMENT` and `ACADEMY_ADMIN` only. The
caller's normal role and athlete-access policy still applies afterwards.

| Route                                                                                                                                                                             | Gate                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `POST athletes/:athleteId/memberships`                                                                                                                                            | `V1_ENROLMENT`, no bypass                               |
| `POST athletes/:athleteId/memberships/:membershipId/checkout`                                                                                                                     | `V1_ENROLMENT`, no bypass                               |
| `GET athletes/:athleteId/memberships`, `GET …/memberships/:membershipId/billing`                                                                                                  | `V1_PORTAL`, staff bypass                               |
| Family: `GET`/`POST me/athletes`, `GET`/`PATCH athletes/:athleteId`, `DELETE me/athletes/:athleteId/link`, `POST`/`DELETE` guardian invitations, `POST family-invitations/accept` | `V1_PORTAL`, staff bypass                               |
| `GET me/schedule`, `GET me/notifications`, `POST me/notifications/:receiptId/read`                                                                                                | `V1_PORTAL`, staff bypass (defence in depth; see below) |

Existing control: the three `me/schedule` and `me/notifications` routes declare
no authorization policy. The global default-deny guard therefore already returns
403 "Authorization policy is required" for every caller. This is unchanged, and
the integration test asserts it as evidence.

The following routes are deliberately not gated:

- `GET academy/offerings`
- `POST payments/webhooks/:provider`, so webhook processing continues
- `POST admin/billing/reconcile-stale-checkouts`
- `/me` identity routes
- the RIC-191 Academy Registration V1 routes (`academy/registration-config`,
  `academy/sessions`, `academy/registrations`)
- leads
- all `admin/*` staff routes

### Tests

- `tests/v1-deferred-feature-gates.test.mjs` is an offline test against the
  compiled controller metadata. It checks the exact route-to-gate mapping, that
  the V1 and operational routes are ungated, and the exact-`"1"` rule.
- `tests/integration/v1-deferred-feature-gates.test.mjs` is a DB-backed direct
  HTTP test that is part of `test:pre-alpha:persistence`. It checks that:
  - guardians and staff get `FEATURE_NOT_AVAILABLE` on enrolment and checkout,
    and no membership or payment rows are written;
  - `true` does not open the gate;
  - unauthenticated callers get 401;
  - guardians are closed out of every portal route, no athlete is created and no
    link is revoked;
  - staff support reads still return 200;
  - `/me`, registration config and sessions, offerings, the webhook and finance
    reconciliation are unaffected;
  - with the exact flag set to `1`, enrolment succeeds (201), which proves the
    gate was the only thing blocking it.

### Hosted actions (not performed)

Leave `KHLIM_ENABLE_V1_ENROLMENT` and `KHLIM_ENABLE_V1_PORTAL` unset in every
hosted API environment until launch is approved. Unset is already closed. On
launch, set the server variable and the matching `NEXT_PUBLIC_*` flag together.

## 3. Frontend handoff (Antigravity)

- **Youth media contract:** no change is needed to render the current placeholders.
  Cards, the carousel and article heroes already show the labelled fallback when
  `canRenderYouthMedia(item)` is false, and that is now always the case. Do not
  add `/media/achievements/*`, `/media/home/*` or the `khlim` team photos back
  under `public/`, because CI fails if they return. To show an approved youth
  image later:
  1. store it in approved private storage;
  2. add `{ url, consentRef, channels: ["website"], reviewBy }` to
     `APPROVED_YOUTH_MEDIA`, using an opaque reference only and no names;
  3. keep the flag on.
- **Gallery and carousel layouts** must tolerate zero images. The homepage
  carousel and club gallery render no photos with the current data.
- **API 403 `FEATURE_NOT_AVAILABLE`:** treat it as "coming soon", not as a
  permission error. Show the existing COMING_SOON state for `feature` and do not
  retry. It can come back from any gated route, even when the browser flag says
  the feature is available.
- **Flags:** `NEXT_PUBLIC_ENABLE_V1_ENROLMENT` and `NEXT_PUBLIC_ENABLE_V1_PORTAL`
  are presentation only. They must mirror `KHLIM_ENABLE_V1_ENROLMENT` and
  `KHLIM_ENABLE_V1_PORTAL`.
- **Unchanged:** RIC-191 Academy Registration V1 continues to use
  `academy/registration-config`, `academy/sessions` and
  `POST academy/registrations`, none of which are gated.
