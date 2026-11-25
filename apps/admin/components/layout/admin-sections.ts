import type { StaffRole } from "../../lib/types";

export interface AdminSectionPage {
  href: string;
  label: string;
  roles?: StaffRole[];
  purpose: string;
  steps: string;
  caution: string;
}

export interface AdminSection {
  href: string;
  label: string;
  icon: string;
  description: string;
  pages: AdminSectionPage[];
}

const MANAGEMENT: StaffRole[] = ["SUPER_ADMIN", "MANAGEMENT"];
const ACADEMY: StaffRole[] = ["SUPER_ADMIN", "MANAGEMENT", "ACADEMY_ADMIN"];
const REPORTING: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
];
const PLAYERS: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
];
const SESSIONS: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
];
const FINANCE: StaffRole[] = ["SUPER_ADMIN", "MANAGEMENT", "FINANCE_ADMIN"];

/**
 * Nine staff workflows, retaining the original routes and server-side permissions.
 * Pages are navigated independently: opening one tab never fetches every other tab.
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/",
    label: "Overview",
    icon: "📊",
    description:
      "The academy at a glance, performance and operational reporting.",
    pages: [
      {
        href: "/",
        label: "Dashboard",
        purpose: "Current academy membership, capacity and follow-up summary.",
        steps:
          "Review live totals, then open the relevant operational section for detail.",
        caution: "A dashboard count is not proof of payment or enrolment.",
      },
      {
        href: "/reports",
        label: "Reports",
        roles: REPORTING,
        purpose:
          "Date-bounded academy activity, membership, attendance and permitted financial reporting.",
        steps:
          "Choose the reporting period, refresh, verify the definitions and export only when approved.",
        caution:
          "Check date boundaries and staff permissions before comparing reports.",
      },
      {
        href: "/insights",
        label: "KPI & Health",
        roles: REPORTING,
        purpose: "Operational KPIs, workload and reliability signals.",
        steps:
          "Review the metric definitions and investigate exceptions in the underlying operations page.",
        caution:
          "A health tile does not guarantee external uptime or successful payments.",
      },
    ],
  },
  {
    href: "/leads",
    label: "Growth & Leads",
    icon: "🎯",
    description: "Manage guardian enquiries and measure campaign results.",
    pages: [
      {
        href: "/leads",
        label: "Leads",
        roles: ACADEMY,
        purpose: "Guardian interest submissions and follow-up status.",
        steps:
          "Filter NEW and follow-up leads, open the enquiry, contact the guardian, and save the outcome.",
        caution:
          "A lead is not an enrolled or paid member. Contact data is private.",
      },
      {
        href: "/insights/campaigns",
        label: "3x3 Campaign",
        roles: ACADEMY,
        purpose:
          "24 October campaign attribution, lead conversion and opt-in traffic.",
        steps:
          "Set the MYT date range, inspect persisted leads and open matching lead records.",
        caution:
          "PostHog CONFIG_REQUIRED means unavailable traffic data, not zero QR scans.",
      },
    ],
  },
  {
    href: "/programmes",
    label: "Academy Setup",
    icon: "🏀",
    description:
      "Define curricula, actual intakes and the plans families can purchase.",
    pages: [
      {
        href: "/programmes",
        label: "Programmes",
        roles: ACADEMY,
        purpose: "Training curricula, athlete age ranges and levels.",
        steps:
          "Review the catalogue and approve age/level rules before creating an intake.",
        caution: "Creating a programme does not open enrolment.",
      },
      {
        href: "/offerings",
        label: "Offerings",
        roles: ACADEMY,
        purpose: "Live cohorts with capacity, venues and enrolment status.",
        steps:
          "Select a programme, confirm a court and real capacity, then manage intake availability.",
        caution: "Registration capacity must be checked live at the backend.",
      },
      {
        href: "/plans",
        label: "Membership Plans",
        roles: ACADEMY,
        purpose: "Pricing, commitments and membership benefits.",
        steps:
          "Review approved terms, configure the plan and verify public-facing prices.",
        caution:
          "Pricing is server-authoritative; a plan does not imply a payment.",
      },
    ],
  },
  {
    href: "/memberships",
    label: "Members & Families",
    icon: "👥",
    description: "Membership records, athletes and authorized guardians.",
    pages: [
      {
        href: "/memberships",
        label: "Memberships",
        roles: PLAYERS,
        purpose: "Established Academy contracts and membership status.",
        steps:
          "Find the contract, inspect its term and billing status before any lifecycle action.",
        caution:
          "A membership record is distinct from an enquiry or payment receipt.",
      },
      {
        href: "/athletes",
        label: "Athletes",
        roles: PLAYERS,
        purpose: "Minor athlete profiles and Academy relationships.",
        steps:
          "Find the athlete, verify family links and review the relevant membership.",
        caution:
          "Minors' personal information requires least-privilege handling.",
      },
      {
        href: "/guardians",
        label: "Guardians",
        roles: PLAYERS,
        purpose: "Guardian profiles and family relationships.",
        steps: "Search the guardian and inspect verified links to athletes.",
        caution:
          "Guardian identity does not grant access to unrelated children.",
      },
    ],
  },
  {
    href: "/scheduling",
    label: "Training Operations",
    icon: "📅",
    description: "Training sessions, attendance and court facilities.",
    pages: [
      {
        href: "/scheduling",
        label: "Scheduling",
        roles: SESSIONS,
        purpose: "Create sessions, record attendance and handle cancellations.",
        steps:
          "Choose the offering and session, verify the details and record attendance when completed.",
        caution:
          "Check for duplicate sessions and stale attendance before saving.",
      },
      {
        href: "/venues",
        label: "Venues & Courts",
        roles: ACADEMY,
        purpose: "Training facilities, courts and available capacity.",
        steps:
          "Verify venue details, register courts and coordinate closures with the schedule.",
        caution:
          "A configured venue is not proof of a confirmed court booking.",
      },
    ],
  },
  {
    href: "/payments",
    label: "Finance",
    icon: "💳",
    description: "Gateway-settled payments and payment operations.",
    pages: [
      {
        href: "/payments",
        label: "Payments",
        roles: FINANCE,
        purpose: "Payment records, provider references and reconciliation.",
        steps:
          "Inspect the gateway record and use approved recovery actions only when necessary.",
        caution: "Never mark a payment settled from client-side status alone.",
      },
    ],
  },
  {
    href: "/editorial",
    label: "Content Management",
    icon: "📰",
    description:
      "Create approved Academy stories and review public publication.",
    pages: [
      {
        href: "/editorial",
        label: "Editorial Studio",
        roles: ACADEMY,
        purpose:
          "Draft achievements and player highlights from verified facts and media.",
        steps:
          "Provide validated facts, check media rights, prepare the draft and submit for review.",
        caution: "Drafting content does not authorize publication.",
      },
      {
        href: "/moderation",
        label: "Moderation",
        roles: MANAGEMENT,
        purpose: "Management review, publication and unpublishing.",
        steps:
          "Check the moderation queue, facts and rights; approve or return items with a clear decision.",
        caution:
          "Publishing youth photos requires independent permission confirmation.",
      },
    ],
  },
  {
    href: "/notifications",
    label: "Communications",
    icon: "🔔",
    description: "Family and programme announcements.",
    pages: [
      {
        href: "/notifications",
        label: "Notifications",
        roles: ACADEMY,
        purpose: "Persistent guardian and programme notices.",
        steps:
          "Confirm audience, dates and content; send through the approved workflow and review the record.",
        caution:
          "Never include unnecessary private athlete details in broad messages.",
      },
    ],
  },
  {
    href: "/users",
    label: "Team & Administration",
    icon: "🔐",
    description:
      "Staff access, accountability and approved operating defaults.",
    pages: [
      {
        href: "/users",
        label: "Accounts & Access",
        roles: MANAGEMENT,
        purpose: "Organization identities, permissions and account status.",
        steps:
          "Find the member, verify authorization and apply only approved role/status changes.",
        caution: "No self-promotion, shared accounts or MFA bypass.",
      },
      {
        href: "/staff",
        label: "Staff",
        roles: MANAGEMENT,
        purpose: "Staff roster and operational roles.",
        steps:
          "Verify the staff member and approved responsibilities before adjusting roles.",
        caution: "Changing the active work view does not grant access.",
      },
      {
        href: "/audit",
        label: "Audit Log",
        roles: MANAGEMENT,
        purpose: "Append-only record of privileged actions.",
        steps:
          "Filter by actor, action and date; escalate unexplained activity.",
        caution: "An audit log is not editable history.",
      },
      {
        href: "/settings",
        label: "Settings",
        roles: MANAGEMENT,
        purpose: "Allowlisted academy preferences and defaults.",
        steps:
          "Review the current defaults, change approved values and check the result.",
        caution:
          "Infrastructure secrets and PostHog keys belong in Vercel, never this form.",
      },
    ],
  },
];

export function matchesAdminPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function getAdminSectionForPath(pathname: string): {
  section: AdminSection;
  page: AdminSectionPage;
} | null {
  // Longest-path match is essential: /insights/campaigns belongs to Growth,
  // not the broader /insights Overview tab.
  let best: { section: AdminSection; page: AdminSectionPage } | null = null;
  for (const section of ADMIN_SECTIONS) {
    for (const page of section.pages) {
      if (
        matchesAdminPath(pathname, page.href) &&
        (!best || page.href.length > best.page.href.length)
      ) {
        best = { section, page };
      }
    }
  }
  return best;
}

export function canViewAdminPage(
  page: AdminSectionPage,
  activeRole: StaffRole | null,
): boolean {
  if (!page.roles) return true;
  return (
    activeRole === "SUPER_ADMIN" ||
    (activeRole !== null && page.roles.includes(activeRole))
  );
}

export function canViewAdminSection(
  section: AdminSection,
  activeRole: StaffRole | null,
): boolean {
  return section.pages.some((page) => canViewAdminPage(page, activeRole));
}
