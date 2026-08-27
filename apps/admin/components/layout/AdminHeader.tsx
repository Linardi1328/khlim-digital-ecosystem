"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../../lib/auth-context";
import type { StaffRole } from "../../lib/types";

export interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  onOpenMobileNav?: () => void;
}

export function AdminHeader({
  onToggleSidebar,
  onOpenMobileNav,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const { user, role, setRole, logout } = useAdminAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getSectionTitle = () => {
    if (pathname === "/" || pathname === "/dashboard") return "Operations Dashboard";
    if (pathname.startsWith("/programmes")) return "Programmes Catalogue";
    if (pathname.startsWith("/offerings")) return "Programme Offerings";
    if (pathname.startsWith("/plans")) return "Membership Plans";
    if (pathname.startsWith("/memberships")) return "Active Memberships";
    if (pathname.startsWith("/athletes")) return "Athletes Directory";
    if (pathname.startsWith("/guardians")) return "Guardians Directory";
    if (pathname.startsWith("/payments")) return "Payment Operations";
    if (pathname.startsWith("/venues")) return "Venues & Courts";
    if (pathname.startsWith("/scheduling")) return "Scheduling & Sessions";
    if (pathname.startsWith("/staff")) return "Staff & Roles";
    if (pathname.startsWith("/audit")) return "Audit Trail";
    if (pathname.startsWith("/settings")) return "Settings";
    return "Operations Console";
  };

  const roles: StaffRole[] = [
    "SUPER_ADMIN",
    "MANAGEMENT",
    "FINANCE",
    "ADMIN",
    "ACADEMY_ADMIN",
    "HEAD_COACH",
    "COACH",
    "EVENT_STAFF",
  ];

  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left section: Hamburger / Breadcrumb title */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="admin-mobile-header-btn"
          aria-label="Open navigation menu"
          style={{
            background: "none",
            border: "1px solid #CBD5E1",
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "1.125rem",
            cursor: "pointer",
            color: "#0F172A",
          }}
        >
          ☰
        </button>

        {/* Section Title */}
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A" }}>
            {getSectionTitle()}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "#64748B" }}>
            KHLIM Digital Sports Ecosystem • Operations Console
          </div>
        </div>
      </div>

      {/* Right section: Search, Environment, Role Switcher, Staff Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Environment Badge */}
        <span
          className="hide-on-mobile"
          style={{
            fontSize: "0.6875rem",
            fontWeight: 800,
            color: "#92400E",
            backgroundColor: "#FEF3C7",
            border: "1px solid #FDE68A",
            padding: "3px 8px",
            borderRadius: "4px",
            letterSpacing: "0.04em",
          }}
        >
          OPS ENVIRONMENT
        </span>

        {/* Global Search Shortcut */}
        <div
          className="hide-on-mobile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            backgroundColor: "#F8FAFC",
            border: "1px solid #CBD5E1",
            borderRadius: "6px",
            fontSize: "0.8125rem",
            color: "#64748B",
            cursor: "pointer",
          }}
          onClick={() => {
            const searchInput = document.querySelector('input[type="search"]') as HTMLElement | null;
            searchInput?.focus();
          }}
        >
          <span>🔍 Quick search...</span>
          <kbd
            style={{
              padding: "2px 5px",
              fontSize: "0.6875rem",
              backgroundColor: "#E2E8F0",
              borderRadius: "4px",
              color: "#475569",
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Notifications Control */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            style={{
              position: "relative",
              background: "none",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "7px 10px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            🔔
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#F59E0B",
              }}
            />
          </button>

          {showNotifications && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "42px",
                width: "300px",
                backgroundColor: "#FFFFFF",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                padding: "16px",
                zIndex: 50,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "8px", color: "#0F172A" }}>
                Operational Alerts
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#64748B", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ padding: "8px", backgroundColor: "#FFFBEB", borderRadius: "6px", border: "1px solid #FDE68A" }}>
                  ⚠️ 1 failed installment requiring review
                </div>
                <div style={{ padding: "8px", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                  ℹ️ 6 pending memberships awaiting webhook
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Staff Role Switcher */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              backgroundColor: "#18181B",
              color: "#FFFFFF",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 600,
            }}
          >
            <span style={{ color: "#F59E0B" }}>●</span>
            <span>{role.replace("_", " ")}</span>
            <span style={{ fontSize: "0.625rem" }}>▼</span>
          </button>

          {showRoleMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "42px",
                width: "220px",
                backgroundColor: "#FFFFFF",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                padding: "8px",
                zIndex: 50,
              }}
            >
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", padding: "6px 8px" }}>
                Switch Active Role Context
              </div>
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setShowRoleMenu(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px",
                    fontSize: "0.8125rem",
                    fontWeight: role === r ? 700 : 500,
                    color: role === r ? "#92400E" : "#0F172A",
                    backgroundColor: role === r ? "#FEF3C7" : "transparent",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Staff User Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              backgroundColor: "#18181B",
              color: "#F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.875rem",
            }}
          >
            {user?.displayName?.[0] || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}
