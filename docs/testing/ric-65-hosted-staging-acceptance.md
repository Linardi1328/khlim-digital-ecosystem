# RIC-65 hosted staging acceptance

## Approved infrastructure

| Component                | Required identity                       |
| ------------------------ | --------------------------------------- |
| Git branch               | `staging/ric-119-120-readonly-20261124` |
| Vercel team              | `team_q0IpWVrUePVFelvMGwl3oCdL`         |
| Vercel API project       | `prj_LnY8hI0PLYuiUI8sOPPKiZsYksgO`      |
| Vercel Web project       | `prj_KORdDwpoWgLROuGhByQOATU7s1kK`      |
| Supabase staging project | `qxsjxcbfhxbvxigghhlq`                  |

The secured release base is `6e42c85e98e9f3aa1ec66aed7ae993e4ec656e12`. Deployment `dpl_AfA6tnSjEA8Sm7BDPoHghEw1M6aU` records earlier smoke-test evidence. Keep active-window authorization off until the integrated candidate and its immutable deployment receive separate approval.

## Deployment verification and readiness

Both workflows are manual, use the protected GitHub environment `staging`, and share the concurrency group `ric-65-hosted-staging`. The job guard matches the exact branch ref `refs/heads/staging/ric-119-120-readonly-20261124`. Before checkout, the workflow compares the dispatch SHA with the approved runner SHA. The runner SHA defaults to the independently approved deployment commit. To authorize a separate runner revision, set the full SHA in the protected `KHLIM_STAGING_EXPECTED_RUNNER_SHA` variable. Checkout pins the dispatch SHA. The job compares actual Git HEAD immediately after checkout, and the runner rechecks HEAD and tracked-file cleanliness before acceptance traffic.

Before probing the application or opening a database connection, the runner sends an authenticated GET to the fixed Vercel management endpoint `https://api.vercel.com/v13/deployments/<id>`, scoped to the pinned team, with `withGitRepoInfo=true`. The response must have the exact deployment ID, owner team, project ID, Git ref, full approved Git SHA, and canonical deployment hostname. Standard Preview has an explicitly present JSON `target: null`. The runner requires `READY` and rejects custom environments, conflicting metadata, and URLs listed as aliases. [Vercel deployment API reference](https://vercel.com/docs/rest-api/deployments/get-a-deployment-by-id-or-url)

The API origin must match the deployment's immutable `url` field. Use an HTTPS origin on port 443 with no user info, path, query, or fragment. Supabase Auth uses an exact staging project origin. All requests reject redirects and have a 15-second deadline, including response body reads. The management token goes only to the Vercel management API. The API bypass header goes only to the attested API. An optional, separately scoped Web bypass header goes only to the independently attested Web preview. The Supabase anon key goes only to staging Supabase Auth. The user and admin tokens go only to the corresponding Admin requests on the attested API.

Readiness verifies `GET /v1/health` reports `status: "ok"` and a connected database with the staging project reference. It then checks `GET /auth/v1/health` on staging Supabase. An unset, false, or malformed active-window value ends a successful readiness run in `SAFE_HALT`. This path uses health GETs only, with no Supabase user bearer tokens, direct database client, or application mutations. A failed check exits with an error.

The broader workflow's `readiness-only` and `both` modes also require web deployment pins. The Web preview is attested independently against the fixed Web project under the same team, branch, and approved SHA. The probe uses a Web-project bypass secret when required. Keep Deployment Protection enabled. Billplz sandbox configuration is checked locally. Browser registration UX remains covered by the mocked Playwright rehearsal in `tests/e2e/staging-browser-acceptance.spec.mjs`.

## Active acceptance

Only the exact runtime value `KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED=1` enables active acceptance. Require an AAL1 user token, an MFA AAL2 Admin token, a staging database URL, and a synthetic contact matched against the approved Malaysian E.164 phone before opening the database client. The contact fixture in the runner is for offline tests. A database preflight count must succeed before any application POST.

The runner verifies both JWT signatures using asymmetric public signing keys from the pinned staging issuer's `/auth/v1/.well-known/jwks.json`. It checks the issuer, `authenticated` audience and role, expiry, expected assurance level, and exact separately approved Supabase user UUID for each account. These UUIDs must be distinct. The key request carries no user credentials. The runner then checks the Admin token against `GET /v1/admin/academy/leads/summary` on the attested API. The summary endpoint applies the same tenant role and MFA policy as lead retrieval and returns aggregate counts. The runner discards the response after validating it. The API authentication guard can upsert the synthetic Admin account even if authorization is denied. This request runs only inside the separately authorized active window and after JWT and database preflight checks. Supabase signing-key verification checks the token's validity through expiry and does not independently check session revocation. [Supabase signing keys](https://supabase.com/docs/guides/auth/signing-keys)

1. Require HTTP 400 for missing consent, injection-like email input, malformed phone and offering UUID, and out-of-range child age.
2. Submit a synthetic Academy lead using `source=3x3-oct24`. Require HTTP 201 and a `RECEIVED` receipt. Replay with the same idempotency key and payload and require the same receipt. Change the payload and require HTTP 409.
3. Require HTTP 401 for unauthenticated Admin access and HTTP 403 with the AAL1 token. Check the paginated Admin list and lead detail using the AAL2 token. Verify the single matching lead, campaign attribution, and `NEW` status.
4. Use separate read-only Prisma counts by receipt ID and idempotency key to verify exactly one persisted lead. Logs contain statuses and verification outcomes and omit response bodies, credentials, and contact details.

The staging database URL must name `/postgres`. Direct connections use `db.qxsjxcbfhxbvxigghhlq.supabase.co:5432` with user `postgres`. The project-specific pooler accepts `postgres` or `postgres.qxsjxcbfhxbvxigghhlq`. A regional Supabase pooler requires `postgres.qxsjxcbfhxbvxigghhlq`. Both pooler types accept ports 5432 and 6543. Only a single `sslmode=require` or `sslmode=verify-full` parameter is allowed. Inherited `PGOPTIONS` and additional URL parameters, including `pgbouncer=true`, are rejected.

The client uses explicit PostgreSQL fields, verifies the server certificate and hostname using the fingerprint-pinned Supabase Root 2021 CA compiled into the API build, and uses finite connection and query deadlines.

## Manual setup for a later approved candidate

1. After review, make the updated workflows available on the default branch for manual dispatch and on the dedicated staging branch for execution. In GitHub's protected `staging` environment, review required reviewers and restrict the deployment branch policy to the exact dedicated branch. Keep the typed active-window dispatch setting false for readiness. [GitHub manual workflow dispatch](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
2. After separate deployment approval, deploy the integrated candidate from the dedicated branch as a standard Vercel Preview in the pinned API project. Verify the branch-scoped staging database and Supabase settings and record the full approved Git SHA, immutable deployment ID, and canonical deployment URL.
3. In the protected `staging` environment, set `KHLIM_STAGING_EXPECTED_COMMIT_SHA` and `KHLIM_STAGING_DEPLOYMENT_ID` as variables and set `KHLIM_STAGING_API_URL` as an environment secret. Review the three candidate values together. Use an environment-scoped `KHLIM_STAGING_VERCEL_TOKEN` with access to the pinned team and deployment metadata and, if Deployment Protection requires it, the project's `VERCEL_AUTOMATION_BYPASS_SECRET`. The workflow also expects `KHLIM_STAGING_SUPABASE_URL` and `KHLIM_STAGING_SUPABASE_ANON_KEY`. The checkout SHA does not supply candidate approval.
4. For the broader workflow, configure the `KHLIM_STAGING_WEB_DEPLOYMENT_ID` environment variable and the canonical origin in the `KHLIM_STAGING_WEB_URL` environment secret. Supply the Web project's automation bypass secret as `KHLIM_STAGING_WEB_VERCEL_BYPASS_SECRET` if needed. Configure the existing Billplz sandbox secrets for the presence check.
5. A separately authorized active window requires the staging environment secrets `KHLIM_STAGING_ADMIN_AAL2_TOKEN`, `KHLIM_STAGING_USER_AAL1_TOKEN`, `KHLIM_STAGING_TEST_PHONE`, `KHLIM_STAGING_APPROVED_TEST_PHONE`, and `KHLIM_STAGING_DATABASE_URL`. It also requires `KHLIM_STAGING_APPROVED_USER_SUBJECT` and `KHLIM_STAGING_APPROVED_ADMIN_SUBJECT` as staging environment secrets containing the approved synthetic account UUIDs. The workflows expose these only to the active runner step when its typed authorization input is true.

## Verify the raw Vercel response after deployment approval

Use the authenticated owner response of the raw v13 endpoint. Its documented full response contains `ownerId`, `projectId`, `id`, `url`, `readyState`, and `status`. The nested `team` and `project` objects are optional and must agree when present. The REST schema makes `target` and portions of `gitSource` optional. The runner requires an explicit JSON null target for standard Preview and a populated `gitSource.ref` and `gitSource.sha`. Reduced responses, connector-normalized output, aliases, and Git display metadata alone cannot establish these facts. [Vercel REST OpenAPI specification](https://openapi.vercel.sh/)

Once the candidate has been separately approved, have an authorized operator run the read-only check below from a trusted shell with the scoped token provided from the approved secret store. Set `review_id`, `review_project`, `review_host`, and `review_sha` to the approved deployment ID, pinned project ID, bare canonical hostname, and full SHA. Repeat for the Web preview when used. The check prints only the HTTP status and a Boolean result. Require HTTP 200 and `true`. If the owner response omits required evidence or returns a conflict, stop and resolve the metadata with Vercel before dispatch.

```bash
(
  set +x
  set -o pipefail
  [[ "$review_id" =~ ^dpl_[[:alnum:]]+$ &&
     "$review_sha" =~ ^[0-9a-f]{40}$ &&
     ( "$review_project" == prj_LnY8hI0PLYuiUI8sOPPKiZsYksgO ||
       "$review_project" == prj_KORdDwpoWgLROuGhByQOATU7s1kK ) &&
     -n "${KHLIM_STAGING_VERCEL_TOKEN:-}" ]] || exit 1
  review_team=team_q0IpWVrUePVFelvMGwl3oCdL
  review_branch=staging/ric-119-120-readonly-20261124
  printf 'Authorization: Bearer %s\n' "$KHLIM_STAGING_VERCEL_TOKEN" |
    curl -q --silent --show-error --fail --proto '=https' --max-time 15 \
      --header @- --header 'Accept: application/json' \
      --write-out '%{stderr}http_status=%{http_code}\n' \
      "https://api.vercel.com/v13/deployments/$review_id?teamId=$review_team&withGitRepoInfo=true" |
    jq -e --arg id "$review_id" --arg team "$review_team" \
      --arg project "$review_project" --arg host "$review_host" \
      --arg ref "$review_branch" --arg sha "$review_sha" '
      .id == $id and .ownerId == $team and .projectId == $project and
      ((has("team") | not) or .team.id == $team) and
      ((has("project") | not) or .project.id == $project) and
      has("target") and .target == null and .customEnvironment == null and
      .readyState == "READY" and .status == "READY" and
      (.deletedAt | not) and (.softDeletedByRetention | not) and
      .gitSource.ref == $ref and .gitSource.sha == $sha and
      ((.gitSource | has("branch") | not) or .gitSource.branch == $ref) and
      ((.meta | has("githubCommitRef") | not) or .meta.githubCommitRef == $ref) and
      ((.meta | has("branch") | not) or .meta.branch == $ref) and
      ((.meta | has("githubCommitSha") | not) or .meta.githubCommitSha == $sha) and
      ((.meta | has("sha") | not) or .meta.sha == $sha) and
      .url == $host and ($host | test("^[a-z0-9-]+[.]vercel[.]app$")) and
      ($host | contains("-git-") | not) and
      ([.alias, .automaticAliases, .userAliases] | map(. // []) | flatten |
        index($host) == null)'
)
```

## Reconcile a partial active run

The runner records an opaque attempt UUID and the request's idempotency key before every validation POST and before dispatching the initial valid lead POST. The final failure marker classifies the last step.

- `BEFORE_SUBMISSION` means the valid lead POST had not started and no validation request was outstanding. The active authentication check may already have upserted the approved synthetic Admin account.
- `VALIDATION_SUBMISSION_UNCERTAIN` identifies a validation POST without a confirmed HTTP 400. If validation regressed, the request could have persisted a lead with its own logged key.
- `LEAD_SUBMISSION_UNCERTAIN` means the request may have reached the server before the runner received and checked a receipt. If the process stopped before logging a failure, use the last submission-started marker.
- `LEAD_RECEIPT_CONFIRMED` means the initial HTTP 201 receipt passed validation and a later check failed. The original idempotency key still identifies the attempt.

For every uncertain or confirmed submission, pause further active runs. Under separate operator authorization, use the approved staging database and a read-only transaction to count rows in `public.academy_leads` where `idempotency_key` exactly equals the logged key. Use a bound parameter and record only the count. One row confirms persistence. More than one is an invariant violation. For zero rows, investigate in-flight work and confirm the final state before considering another approved attempt. Do not rerun the active workflow to resolve an ambiguous result. Any separately authorized replay must reuse the original key and exact payload. The runner performs no automatic recovery submission.

## Offline verification

```bash
DATABASE_URL=postgresql://postgres@localhost:5432/build_only_inert pnpm --filter @khlim/api build
node --test tests/ric-65-staging-acceptance.test.mjs tests/phase-6-staging-acceptance.test.mjs
```
