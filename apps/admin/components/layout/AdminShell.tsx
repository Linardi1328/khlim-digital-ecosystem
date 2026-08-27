"use client";

import React, { useState, type ReactNode } from "react";
import { useAdminAuth } from "../../lib/auth-context";
import { ADMIN_DEMO_NOTICE } from "../../lib/demo-mode";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Drawer } from "../ui/Drawer";

export interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const { isAuthenticated, isLoading, isDemoMode } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (isLoading) {
    return (
      <main className="admin-access-gate">
        <p>Verifying staff access…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="admin-access-gate">
        <div className="admin-access-card">
          <div className="admin-access-mark">K</div>
          <h1>KHLIM Operations Console</h1>
          <p>
            Staff authentication is not configured for this environment. Access
            remains denied until the Supabase staff session and backend role/MFA
            checks are connected.
          </p>
          <p className="admin-access-note">
            For frontend QA only, build with NEXT_PUBLIC_ADMIN_DEMO_MODE=true.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#F8FAFC",
      }}
    >
      <div className="admin-desktop-sidebar">
        <AdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <Drawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        title="Operations Menu"
        width="280px"
      >
        <AdminSidebar onNavigate={() => setIsMobileNavOpen(false)} />
      </Drawer>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {isDemoMode && (
          <div className="admin-demo-banner" role="status">
            <strong>DEMO MODE</strong>
            <span>{ADMIN_DEMO_NOTICE}</span>
          </div>
        )}

        <AdminHeader
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main
          style={{
            flex: 1,
            padding: "28px 28px 60px",
            maxWidth: "1440px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
