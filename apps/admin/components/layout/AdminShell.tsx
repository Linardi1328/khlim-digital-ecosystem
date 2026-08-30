"use client";

import React, { useState, type FormEvent, type ReactNode } from "react";
import { useAdminAuth } from "../../lib/auth-context";
import { ADMIN_DEMO_NOTICE } from "../../lib/demo-mode";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Drawer } from "../ui/Drawer";

export interface AdminShellProps {
  children: ReactNode;
}

function StaffSignIn() {
  const { signIn, authError, isLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    await signIn(email, password).catch(() => undefined);
  }

  return (
    <main className="admin-access-gate">
      <form className="admin-access-card" onSubmit={submit}>
        <div className="admin-access-mark" aria-hidden="true">
          K
        </div>
        <h1>KHLIM Operations Console</h1>
        <p>
          Sign in with your approved staff account. Admin access is checked
          against KHLIM roles on every session.
        </p>

        <label htmlFor="admin-email" style={{ textAlign: "left", display: "block" }}>
          Staff email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{
            width: "100%",
            minHeight: 46,
            boxSizing: "border-box",
            border: "1px solid #CBD5E1",
            borderRadius: 8,
            padding: "10px 12px",
            font: "inherit",
            margin: "6px 0 14px",
          }}
        />

        <label
          htmlFor="admin-password"
          style={{ textAlign: "left", display: "block" }}
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{
            width: "100%",
            minHeight: 46,
            boxSizing: "border-box",
            border: "1px solid #CBD5E1",
            borderRadius: 8,
            padding: "10px 12px",
            font: "inherit",
            margin: "6px 0 14px",
          }}
        />

        {authError && (
          <p
            role="alert"
            style={{
              color: "#991B1B",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: 10,
              textAlign: "left",
            }}
          >
            {authError}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            minHeight: 46,
            border: 0,
            borderRadius: 8,
            background: "#F59E0B",
            color: "#18181B",
            fontWeight: 800,
            fontSize: "1rem",
            cursor: isLoading ? "wait" : "pointer",
          }}
        >
          {isLoading ? "Checking staff access…" : "Sign in to Admin Console"}
        </button>

        <p className="admin-access-note">
          This console is for authorised KHLIM staff only. Privileged operations
          also require multi-factor authentication.
        </p>
      </form>
    </main>
  );
}

function MfaGate() {
  const { refreshSession, logout, isLoading, authError } = useAdminAuth();

  return (
    <main className="admin-access-gate">
      <div className="admin-access-card">
        <div className="admin-access-mark" aria-hidden="true">
          2
        </div>
        <h1>MFA verification required</h1>
        <p>
          Your staff password was accepted, but KHLIM admin operations require
          multi-factor assurance level 2 before the console can open.
        </p>
        <p className="admin-access-note">
          Complete MFA for your Supabase-authenticated staff account, then choose
          “Check again”. No privileged admin data is shown before MFA succeeds.
        </p>
        {authError && <p role="alert">{authError}</p>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginTop: 16,
          }}
        >
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void refreshSession().catch(() => undefined)}
            style={{
              minHeight: 46,
              border: 0,
              borderRadius: 8,
              background: "#F59E0B",
              color: "#18181B",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Check again
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            style={{
              minHeight: 46,
              border: "1px solid #CBD5E1",
              borderRadius: 8,
              background: "#FFFFFF",
              color: "#334155",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const { isAuthenticated, isLoading, isDemoMode, mfaSatisfied } =
    useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (isLoading && !isAuthenticated) {
    return (
      <main className="admin-access-gate" aria-live="polite">
        <p>Verifying staff access…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <StaffSignIn />;
  }

  if (!isDemoMode && !mfaSatisfied) {
    return <MfaGate />;
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
