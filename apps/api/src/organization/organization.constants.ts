export const DEFAULT_ORGANIZATION_SLUG =
  process.env.KHLIM_DEFAULT_ORGANIZATION_SLUG?.trim().toLowerCase() ||
  "khlim-basketball";

export const ORGANIZATION_STAFF_ROLES = [
  "COACH",
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "EVENT_STAFF",
] as const;

export type OrganizationStaffRole = (typeof ORGANIZATION_STAFF_ROLES)[number];

export const ORGANIZATION_HEADER = "x-khlim-organization";
