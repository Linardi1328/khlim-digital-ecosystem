# PR #32 — Scheduling & Attendance acceptance

Repository acceptance requires Prisma validation/migration, the complete regression suite, lint/format checks, and successful API/Admin/web builds.

Manual staging later: create a fake session in Admin, add manual attendance, change attendance status, complete/cancel a session, and confirm membership-scoped sessions render in `/portal/schedule`. Session creation/update/cancellation requires an MFA-authenticated staff session.

Vercel preview deployment is intentionally deferred while the project is at its deployment usage limit.
