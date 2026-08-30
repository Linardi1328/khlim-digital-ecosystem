"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../../lib/auth-context";
import type { StaffRole } from "../../lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
  roles?: StaffRole[];
}

const MANAGEMENT: StaffRole[] = ["SUPER_ADMIN", "MANAGEMENT"];
const ACADEMY_MANAGEMENT: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "ACADEMY_ADMIN",
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
const FINANCE: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "FINANCE",
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "📊" },
  {
    href: "/programmes",
    label: "Programmes",
    icon: "🏀",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/offerings",
    label: "Offerings",
    icon: "🏟️",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/plans",
    label: "Membership Plans",
    icon: "🏷️",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/memberships",
    label: "Memberships",
    icon: "🏅",
    roles: PLAYER_OPERATIONS,
  },
  {
    href: "/athletes",
    label: "Athletes",
    icon: "👦",
    roles: PLAYER_OPERATIONS,
  },
  {
    href: "/guardians",
    label: "Guardians",
    icon: "👥",
    roles: PLAYER_OPERATIONS,
  },
  { href: "/payments", label: "Payments", icon: "💳", roles: FINANCE },
  {
    href: "/venues",
    label: "Venues",
    icon: "📍",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/scheduling",
    label: "Scheduling",
    icon: "📅",
    roles: SESSION_OPERATIONS,
  },
  {
    href: "/editorial",
    label: "Editorial Studio",
    icon: "📰",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "🔔",
    roles: ACADEMY_MANAGEMENT,
  },
  {
    href: "/users",
    label: "Accounts & Access",
    icon: "🔐",
    roles: MANAGEMENT,
  },
  { href: "/staff", label: "Staff", icon: "👔", roles: MANAGEMENT },
  { href: "/audit", label: "Audit Log", icon: "📜", roles: MANAGEMENT },
  { href: "/settings", label: "Settings", icon: "⚙️", roles: MANAGEMENT },
];

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
  const { hasRole, role } = useAdminAuth();

  const isRouteActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      aria-label="Admin Operations Sidebar"
      style={{
        width: isCollapsed ? "72px" : "260px",
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
          minHeight: "64px",
          padding: isCollapsed ? "0 14px" : "0 16px",
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
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "#F59E0B",
              color: "#18181B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "1.25rem",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            K
          </div>
          {!isCollapsed && (
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "1.0625rem",
                  color: "#FFFFFF",
                  letterSpacing: "0.04em",
                  lineHeight: 1.1,
                }}
              >
                KHLIM
              </div>
              <div
                style={{
                  fontSize: "0.6875rem",
                  color: "#A1A1AA",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Ops Console
              </div>
            </div>
          )}
        </Link>

        {!isCollapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            style={{
              minWidth: 44,
              minHeight: 44,
              background: "none",
              border: "none",
              color: "#A1A1AA",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            ◀
          </button>
        )}
      </div>

      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          if (item.roles && !hasRole(item.roles)) return null;

          const active = isRouteActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
              style={{
                minHeight: 44,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: isCollapsed ? "8px 0" : "8px 12px",
                justifyContent: isCollapsed ? "center" : "flex-start",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: active ? 700 : 500,
                color: active ? "#FFFFFF" : "#D4D4D8",
                backgroundColor: active ? "#27272A" : "transparent",
                borderLeft: active
                  ? "3px solid #F59E0B"
                  : "3px solid transparent",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "1.125rem" }} aria-hidden="true">
                {item.icon}
              </span>
              {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!isCollapsed && item.badge && <span>{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid #27272A",
            backgroundColor: "#121212",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "#A1A1AA",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Active Staff Role
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
        </div>
      )}
    </aside>
  );
}
