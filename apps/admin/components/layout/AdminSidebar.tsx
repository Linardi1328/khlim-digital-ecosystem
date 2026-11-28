"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../../lib/auth-context";
import type { StaffRole } from "../../lib/types";

export type NavGroupId =
  "overview" | "academy" | "finance" | "content" | "administration";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  group: NavGroupId;
  badge?: string | number;
  roles?: StaffRole[];
}

export type NavIconName =
  | "dashboard"
  | "insights"
  | "campaign"
  | "registrations"
  | "leads"
  | "programmes"
  | "offerings"
  | "venues"
  | "scheduling"
  | "athletes"
  | "guardians"
  | "memberships"
  | "plans"
  | "payments"
  | "reports"
  | "editorial"
  | "moderation"
  | "notifications"
  | "users"
  | "staff"
  | "audit"
  | "settings";

export const ADMIN_NAV_GROUPS: ReadonlyArray<{
  id: NavGroupId;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "academy", label: "Academy Operations" },
  { id: "finance", label: "Finance" },
  { id: "content", label: "Content & Communications" },
  { id: "administration", label: "Administration" },
];

const MANAGEMENT: StaffRole[] = ["SUPER_ADMIN", "MANAGEMENT"];
const ACADEMY_MANAGEMENT: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
];
const REPORTING: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
];
const PLAYER_OPERATIONS: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
];
const SESSION_OPERATIONS: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
];
const FINANCE: StaffRole[] = ["SUPER_ADMIN", "MANAGEMENT", "FINANCE_ADMIN"];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  // Overview
  { href: "/", label: "Dashboard", icon: "dashboard", group: "overview" },
  {
    href: "/insights",
    label: "KPI & Health",
    icon: "insights",
    group: "overview",
    roles: REPORTING,
  },
  {
    href: "/insights/campaigns",
    label: "3x3 Campaign",
    icon: "campaign",
    group: "overview",
    badge: "24 Oct",
    roles: ACADEMY_MANAGEMENT,
  },

  // Academy Operations
  {
    href: "/registrations",
    label: "Academy Registrations",
    icon: "registrations",
    group: "academy",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/leads",
    label: "Leads",
    icon: "leads",
    group: "academy",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/programmes",
    label: "Programmes",
    icon: "programmes",
    group: "academy",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/offerings",
    label: "Offerings",
    icon: "offerings",
    group: "academy",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/venues",
    label: "Venues",
    icon: "venues",
    group: "academy",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/scheduling",
    label: "Scheduling",
    icon: "scheduling",
    group: "academy",
    roles: SESSION_OPERATIONS,
  },
  {
    href: "/athletes",
    label: "Athletes",
    icon: "athletes",
    group: "academy",
    roles: PLAYER_OPERATIONS,
  },
  {
    href: "/guardians",
    label: "Guardians",
    icon: "guardians",
    group: "academy",
    roles: PLAYER_OPERATIONS,
  },

  // Finance
  {
    href: "/memberships",
    label: "Memberships",
    icon: "memberships",
    group: "finance",
    roles: PLAYER_OPERATIONS,
  },
  {
    href: "/plans",
    label: "Membership Plans",
    icon: "plans",
    group: "finance",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/payments",
    label: "Payments",
    icon: "payments",
    group: "finance",
    roles: FINANCE,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "reports",
    group: "finance",
    roles: REPORTING,
  },

  // Content & Communications
  {
    href: "/editorial",
    label: "Editorial Studio",
    icon: "editorial",
    group: "content",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/moderation",
    label: "Moderation",
    icon: "moderation",
    group: "content",
    roles: MANAGEMENT,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "notifications",
    group: "content",
    roles: ACADEMY_MANAGEMENT,
  },

  // Administration
  {
    href: "/users",
    label: "Accounts & Access",
    icon: "users",
    group: "administration",
    roles: MANAGEMENT,
  },
  {
    href: "/staff",
    label: "Staff",
    icon: "staff",
    group: "administration",
    roles: MANAGEMENT,
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: "audit",
    group: "administration",
    roles: MANAGEMENT,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    group: "administration",
    roles: MANAGEMENT,
  },
];

function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const stroke = active ? "#F59E0B" : "currentColor";
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    style: { flexShrink: 0 },
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "insights":
      return (
        <svg {...common}>
          <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
        </svg>
      );
    case "campaign":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
    case "registrations":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
      );
    case "leads":
      return (
        <svg {...common}>
          <path d="M4 4h16v12H5.5L4 17.5V4z" />
          <path d="M8 9h8" />
          <path d="M8 12.5h5" />
        </svg>
      );
    case "programmes":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8" />
          <path d="M3.6 15h16.8" />
          <path d="M12 3a13 13 0 0 0 0 18" />
          <path d="M12 3a13 13 0 0 1 0 18" />
        </svg>
      );
    case "offerings":
      return (
        <svg {...common}>
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M3 12l9 4 9-4" />
          <path d="M3 17l9 4 9-4" />
        </svg>
      );
    case "venues":
      return (
        <svg {...common}>
          <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "scheduling":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 10h18" />
        </svg>
      );
    case "athletes":
      return (
        <svg {...common}>
          <circle cx="12" cy="7.5" r="3.5" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "guardians":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="16.5" cy="9" r="2.5" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <path d="M14.5 19.5a4.5 4.5 0 0 1 6 0" />
        </svg>
      );
    case "memberships":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 10h4" />
          <path d="M7 14h6" />
          <circle cx="16.5" cy="12" r="2" />
        </svg>
      );
    case "plans":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h10" />
        </svg>
      );
    case "payments":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="2" />
          <path d="M2.5 10h19" />
          <path d="M6.5 15h4" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16V10" />
          <path d="M12 16V6" />
          <path d="M17 16v-4" />
        </svg>
      );
    case "editorial":
      return (
        <svg {...common}>
          <path d="M4 5h12v14H4z" />
          <path d="M16 9h4v10h-4" />
          <path d="M7.5 9h5" />
          <path d="M7.5 13h5" />
        </svg>
      );
    case "moderation":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
          <path d="M9.5 12l1.8 1.8 3.5-3.8" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 1 1 8 0v4" />
        </svg>
      );
    case "staff":
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
          <path d="M12 13v4" />
        </svg>
      );
    case "audit":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

export interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AdminSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { role } = useAdminAuth();

  const isRouteActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    if (href === "/insights") return pathname === "/insights";
    return pathname.startsWith(href);
  };

  const isVisibleInWorkView = (item: NavItem) => {
    if (!item.roles) return true;
    if (role === "SUPER_ADMIN") return true;
    return Boolean(role && item.roles.includes(role));
  };

  return (
    <aside
      aria-label="Admin Operations Sidebar"
      style={{
        width: isCollapsed ? "72px" : "264px",
        backgroundColor: "#18181B",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid #27272A",
        transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          minHeight: "68px",
          padding: isCollapsed ? "0 12px" : "0 14px",
          borderBottom: "1px solid #27272A",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          gap: 8,
        }}
      >
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="KHLIM Admin dashboard"
          style={{
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              width: 38,
              height: 40,
              borderRadius: 9,
              backgroundColor: "#0B0B0D",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: 3,
            }}
          >
            <img
              src="/khs-academy-logo.webp"
              alt=""
              aria-hidden="true"
              width={28}
              height={34}
              style={{
                width: 28,
                height: 34,
                objectFit: "contain",
                display: "block",
              }}
            />
          </span>
          {!isCollapsed && (
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "1rem",
                  color: "#FFFFFF",
                  letterSpacing: "0.05em",
                  lineHeight: 1.1,
                }}
              >
                KHLIM
              </div>
              <div
                style={{
                  fontSize: "0.66rem",
                  color: "#F59E0B",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                Ops Console
              </div>
            </div>
          )}
        </Link>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              minWidth: 36,
              minHeight: 44,
              background: "none",
              border: "none",
              color: "#A1A1AA",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: isCollapsed ? "none" : "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ◀
          </button>
        )}
      </div>

      <nav
        aria-label="Operations navigation"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 8px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {ADMIN_NAV_GROUPS.map((group) => {
          const visibleItems = ADMIN_NAV_ITEMS.filter(
            (item) => item.group === group.id && isVisibleInWorkView(item),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div
              key={group.id}
              role="group"
              aria-label={group.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {!isCollapsed && (
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#71717A",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "4px 12px 4px",
                  }}
                >
                  {group.label}
                </div>
              )}
              {visibleItems.map((item) => {
                const active = isRouteActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className="admin-nav-link"
                    style={{
                      minHeight: 44,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      gap: "11px",
                      padding: isCollapsed ? "8px 0" : "8px 12px",
                      justifyContent: isCollapsed ? "center" : "flex-start",
                      borderRadius: "8px",
                      fontSize: "0.84rem",
                      fontWeight: active ? 700 : 500,
                      color: active ? "#FFFFFF" : "#D4D4D8",
                      backgroundColor: active ? "#27272A" : "transparent",
                      borderLeft: active
                        ? "3px solid #F59E0B"
                        : "3px solid transparent",
                      textDecoration: "none",
                    }}
                  >
                    <NavIcon name={item.icon} active={active} />
                    {!isCollapsed && (
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "999px",
                          backgroundColor: "rgba(245, 158, 11, 0.16)",
                          color: "#FCD34D",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          flexShrink: 0,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {isCollapsed && onToggleCollapse ? (
        <div
          style={{
            padding: "10px",
            borderTop: "1px solid #27272A",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            style={{
              minWidth: 44,
              minHeight: 44,
              background: "#27272A",
              border: "1px solid #3F3F46",
              borderRadius: 8,
              color: "#E4E4E7",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            ▶
          </button>
        </div>
      ) : null}

      {!isCollapsed && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid #27272A",
            backgroundColor: "#121212",
          }}
        >
          <div
            style={{
              fontSize: "0.66rem",
              color: "#A1A1AA",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            Active Work View
          </div>
          <div
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: role ? "#F59E0B" : "#A1A1AA",
              marginTop: "2px",
            }}
          >
            {role ? role.replaceAll("_", " ") : "Not authenticated"}
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#71717A",
              fontSize: "0.6875rem",
              lineHeight: 1.35,
            }}
          >
            Navigation context only; permissions remain tied to your account.
          </div>
        </div>
      )}
    </aside>
  );
}
