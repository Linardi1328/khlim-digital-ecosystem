"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../../lib/auth-context";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
  requiresFinance?: boolean;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/programmes", label: "Programmes", icon: "🏀" },
  { href: "/offerings", label: "Offerings", icon: "🏟️" },
  { href: "/plans", label: "Membership Plans", icon: "🏷️" },
  { href: "/memberships", label: "Memberships", icon: "🏅" },
  { href: "/athletes", label: "Athletes", icon: "👦" },
  { href: "/guardians", label: "Guardians", icon: "👥" },
  { href: "/payments", label: "Payments", icon: "💳", requiresFinance: true },
  { href: "/venues", label: "Venues", icon: "📍" },
  { href: "/scheduling", label: "Scheduling", icon: "📅" },
  { href: "/editorial", label: "Editorial Studio", icon: "📰" },
  { href: "/staff", label: "Staff", icon: "👔" },
  { href: "/audit", label: "Audit Log", icon: "📜" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
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
  const { canAccessFinance, role } = useAdminAuth();

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
          height: "64px",
          padding: isCollapsed ? "0 16px" : "0 20px",
          borderBottom: "1px solid #27272A",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
        }}
      >
        <Link
          href="/"
          onClick={onNavigate}
          style={{
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
              background: "none",
              border: "none",
              color: "#71717A",
              cursor: "pointer",
              padding: "4px",
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
          padding: "16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          if (item.requiresFinance && !canAccessFinance()) {
            return null;
          }

          const active = isRouteActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: isCollapsed ? "10px 0" : "9px 12px",
                justifyContent: isCollapsed ? "center" : "flex-start",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: active ? 700 : 500,
                color: active ? "#FFFFFF" : "#A1A1AA",
                backgroundColor: active ? "#27272A" : "transparent",
                borderLeft: active
                  ? "3px solid #F59E0B"
                  : "3px solid transparent",
                textDecoration: "none",
                transition: "all 0.12s ease",
              }}
            >
              <span
                style={{ fontSize: "1.125rem", lineHeight: 1 }}
                aria-hidden="true"
              >
                {item.icon}
              </span>

              {!isCollapsed && (
                <span
                  style={{
                    flex: 1,
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
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    backgroundColor: active ? "#F59E0B" : "#3F3F46",
                    color: active ? "#18181B" : "#FFFFFF",
                    padding: "1px 6px",
                    borderRadius: "9999px",
                  }}
                >
                  {item.badge}
                </span>
              )}
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
              color: "#71717A",
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
