# PR #33 — Notifications acceptance

Repository acceptance requires Prisma validation/migration, complete regression/lint/format checks, and successful API/Admin/web builds.

Manual staging later: send a fake Admin announcement to a test audience, verify it appears in `/portal/notifications`, mark it read, and confirm unread state persists. Also cancel a test session linked to a programme offering and confirm an automatic schedule-change notice reaches the affected test guardian account.

Vercel preview deployment is intentionally deferred while the project is at its deployment usage limit.
