"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "../../lib/i18n-context";
import { useAuth } from "../../lib/auth-context";
import { LocaleSwitcher } from "../layout/locale-switcher";
import { ChildSwitcher } from "./child-switcher";

export interface PortalShellProps {
  children: ReactNode;
}

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { guardianProfile, logout } = useAuth();

  const navItems = [
    { href: "/portal/dashboard", label: t("nav.dashboard"), icon: "📊" },
    { href: "/portal/players", label: t("nav.players"), icon: "👦" },
    { href: "/portal/membership", label: t("nav.membership"), icon: "🏅" },
    { href: "/portal/payments", label: t("nav.payments"), icon: "💳" },
    { href: "/portal/schedule", label: t("nav.schedule"), icon: "📅" },
    { href: "/portal/notifications", label: t("nav.notifications"), icon: "🔔" },
    { href: "/portal/account", label: t("nav.account"), icon: "⚙️" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#F8FAFC" }}>
      {/* Desktop Left Sidebar */}
      <aside
        style={{
          width: "260px",
          backgroundColor: "#18181B",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          borderRight: "1px solid #27272A",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #27272A" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
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
              }}
            >
              K
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: "1.125rem", color: "#FFFFFF", letterSpacing: "0.04em" }}>
                KHLIM
              </div>
              <div style={{ fontSize: "0.6875rem", color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Parent Member Portal
              </div>
            </div>
          </Link>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.9375rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#FFFFFF" : "#A1A1AA",
                  backgroundColor: isActive ? "#27272A" : "transparent",
                  borderLeft: isActive ? "3px solid #F59E0B" : "3px solid transparent",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: "1.125rem" }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Summary / Logout */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #27272A" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#FFFFFF" }}>
                {guardianProfile?.displayName ?? "Guardian"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#71717A" }}>Parent Account</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: "none",
                border: "none",
                color: "#A1A1AA",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Header */}
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
          {/* Child Switcher Component */}
          <ChildSwitcher />

          {/* Right Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <LocaleSwitcher />
            <Link
              href="/enrol"
              style={{
                padding: "6px 14px",
                backgroundColor: "#F59E0B",
                color: "#18181B",
                fontWeight: 700,
                fontSize: "0.8125rem",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              + Enrol Player
            </Link>
          </div>
        </header>

        {/* Body Content */}
        <main style={{ flex: 1, padding: "32px 24px 80px", maxWidth: "1200px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
