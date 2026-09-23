"use client";

import React, {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAdminAuth } from "../../lib/auth-context";
import {
  challengeAdminTotpFactor,
  enrollAdminTotpFactor,
  listAdminTotpFactors,
  verifyAdminTotpFactor,
  type AdminTotpEnrollment,
} from "../../lib/supabase-auth";
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
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    await signIn(email, password).catch(() => undefined);
  }

  return (
    <main className="admin-access-gate">
      <form className="admin-access-card" onSubmit={submit}>
        <img
          src="/khs-academy-logo.webp"
          alt="KHLIM Sports Academy"
          width={68}
          height={80}
          style={{
            width: 68,
            height: 80,
            objectFit: "contain",
            display: "block",
            margin: "0 auto 12px",
          }}
        />
        <h1>KHLIM Operations Console</h1>
        <p>
          Sign in with your approved staff account. Admin access is checked
          against KHLIM roles on every session.
        </p>

        <label
          htmlFor="admin-email"
          style={{ textAlign: "left", display: "block" }}
        >
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
          type={showPassword ? "text" : "password"}
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
            margin: "6px 0 4px",
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-pressed={showPassword}
          style={{
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 4px",
            marginBottom: 10,
            border: 0,
            background: "transparent",
            color: "#92400E",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {showPassword ? "Hide password" : "Show password"}
        </button>

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
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<AdminTotpEnrollment | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [checkingFactors, setCheckingFactors] = useState(true);
  const [working, setWorking] = useState(false);
  const [mfaError, setMfaError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listAdminTotpFactors()
      .then((factors) => {
        if (!cancelled) setFactorId(factors[0]?.id ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          setMfaError(
            error instanceof Error
              ? error.message
              : "MFA factors could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingFactors(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnrollment() {
    setWorking(true);
    setMfaError("");
    try {
      const created = await enrollAdminTotpFactor();
      setEnrollment(created);
      setFactorId(created.id);
    } catch (error) {
      setMfaError(
        error instanceof Error ? error.message : "MFA setup could not start.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code.trim())) return;

    setWorking(true);
    setMfaError("");
    try {
      const challengeId = await challengeAdminTotpFactor(factorId);
      await verifyAdminTotpFactor(factorId, challengeId, code);
      await refreshSession();
    } catch (error) {
      setMfaError(
        error instanceof Error
          ? error.message
          : "MFA verification was not accepted.",
      );
    } finally {
      setWorking(false);
    }
  }

  const busy = isLoading || working || checkingFactors;

  return (
    <main className="admin-access-gate">
      <div className="admin-access-card">
        <img
          src="/khs-academy-logo.webp"
          alt="KHLIM Sports Academy"
          width={68}
          height={80}
          style={{
            width: 68,
            height: 80,
            objectFit: "contain",
            display: "block",
            margin: "0 auto 12px",
          }}
        />
        <h1>MFA verification required</h1>
        <p>
          Your staff password was accepted, but KHLIM admin operations require
          multi-factor assurance level 2 before the console can open.
        </p>

        {checkingFactors ? (
          <p className="admin-access-note">Checking MFA setup…</p>
        ) : factorId ? (
          <form onSubmit={submitCode}>
            {enrollment ? (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  margin: "14px 0",
                  textAlign: "left",
                }}
              >
                <p style={{ margin: 0 }}>
                  Scan this QR code with an authenticator app, then enter the
                  six-digit code below.
                </p>
                <img
                  src={enrollment.qrCode}
                  alt="KHLIM Admin MFA authenticator QR code"
                  style={{
                    width: 220,
                    maxWidth: "100%",
                    justifySelf: "center",
                    background: "#FFFFFF",
                    padding: 8,
                    borderRadius: 8,
                  }}
                />
                <details>
                  <summary>Cannot scan the QR code?</summary>
                  <p className="admin-access-note">
                    Enter this setup key manually in your authenticator app:
                  </p>
                  <code style={{ overflowWrap: "anywhere" }}>
                    {enrollment.secret}
                  </code>
                </details>
              </div>
            ) : (
              <p className="admin-access-note">
                Enter the six-digit code from your registered authenticator app.
              </p>
            )}

            <label
              htmlFor="admin-mfa-code"
              style={{ textAlign: "left", display: "block" }}
            >
              Authenticator code
            </label>
            <input
              id="admin-mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              style={{
                width: "100%",
                minHeight: 46,
                boxSizing: "border-box",
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                padding: "10px 12px",
                font: "inherit",
                margin: "6px 0 14px",
                letterSpacing: "0.2em",
                textAlign: "center",
              }}
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              style={{
                width: "100%",
                minHeight: 46,
                border: 0,
                borderRadius: 8,
                background: "#F59E0B",
                color: "#18181B",
                fontWeight: 800,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {working ? "Verifying…" : "Verify MFA"}
            </button>
          </form>
        ) : (
          <div>
            <p className="admin-access-note">
              No verified authenticator is enrolled for this staff account. Set
              one up before continuing.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void startEnrollment()}
              style={{
                width: "100%",
                minHeight: 46,
                border: 0,
                borderRadius: 8,
                background: "#F59E0B",
                color: "#18181B",
                fontWeight: 800,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {working ? "Starting MFA setup…" : "Set up authenticator"}
            </button>
          </div>
        )}

        {(mfaError || authError) && (
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
            {mfaError || authError}
          </p>
        )}

        <p className="admin-access-note">
          No privileged admin data is shown before MFA succeeds.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          style={{
            minHeight: 44,
            border: 0,
            background: "transparent",
            color: "#475569",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
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
