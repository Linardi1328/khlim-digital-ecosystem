"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../../lib/auth-context";
import type { StaffRole } from "../../lib/types";

export interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  onOpenMobileNav?: () => void;
}

const DEMO_ROLES: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE",
  "ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
];

export function AdminHeader({ onOpenMobileNav }: AdminHeaderProps) {
  const pathname = usePathname();
  const { user, role, setRole, isDemoMode } = useAdminAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getSectionTitle = () => {
    if (pathname === "/" || pathname === "/dashboard") {
      return "Operations Dashboard";
    }
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

  return (
    <header
      style={{
        minHeight: "64px",
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          minWidth: 0,
        }}
      >
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
            flexShrink: 0,
          }}
        >
          ☰
        </button>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A" }}>
            {getSectionTitle()}
          </div>
          <div
            className="hide-on-mobile"
            style={{ fontSize: "0.6875rem", color: "#64748B" }}
          >
            KHLIM Digital Sports Ecosystem • Operations Console
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <span
          className="hide-on-mobile"
          style={{
            fontSize: "0.6875rem",
            fontWeight: 800,
            color: isDemoMode ? "#92400E" : "#475569",
            backgroundColor: isDemoMode ? "#FEF3C7" : "#F1F5F9",
            border: `1px solid ${isDemoMode ? "#FDE68A" : "#CBD5E1"}`,
            padding: "3px 8px",
            borderRadius: "4px",
            letterSpacing: "0.04em",
          }}
        >
          {isDemoMode ? "DEMO" : "STAFF"}
        </span>

        <div className="hide-on-mobile" style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowNotifications((current) => !current)}
            aria-label="View notifications"
            style={{
              background: "none",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "7px 10px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            🔔
          </button>

          {showNotifications && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "42px",
                width: "280px",
                backgroundColor: "#FFFFFF",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                padding: "16px",
                zIndex: 50,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                Operational Alerts
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                  color: "#64748B",
                }}
              >
                {isDemoMode
                  ? "Demo mode does not display live operational alerts."
                  : "Notification integration is pending backend support."}
              </p>
            </div>
          )}
        </div>

        {isDemoMode && role && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowRoleMenu((current) => !current)}
              aria-label="Switch demo role"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                backgroundColor: "#18181B",
                color: "#FFFFFF",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              <span style={{ color: "#F59E0B" }}>●</span>
              <span className="hide-on-mobile">{role.replaceAll("_", " ")}</span>
              <span style={{ fontSize: "0.625rem" }}>▼</span>
            </button>

            {showRoleMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "42px",
                  width: "220px",
                  maxHeight: "70vh",
                  overflowY: "auto",
                  backgroundColor: "#FFFFFF",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  padding: "8px",
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: "#64748B",
                    padding: "6px 8px",
                  }}
                >
                  Demo permission preview only
                </div>
                {DEMO_ROLES.map((demoRole) => (
                  <button
                    key={demoRole}
                    type="button"
                    onClick={() => {
                      setRole(demoRole);
                      setShowRoleMenu(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px",
                      fontSize: "0.8125rem",
                      fontWeight: role === demoRole ? 700 : 500,
                      color: role === demoRole ? "#92400E" : "#0F172A",
                      backgroundColor:
                        role === demoRole ? "#FEF3C7" : "transparent",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    {demoRole.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          title={user?.displayName ?? "Staff user"}
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
          {user?.displayName?.[0] ?? "?"}
        </div>
      </div>
    </header>
  );
}
