export const KHLIM_USER_ROLES = [
  "GUARDIAN",
  "ATHLETE",
  "COACH",
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "EVENT_STAFF",
] as const;

export type KhlimUserRole = (typeof KHLIM_USER_ROLES)[number];
