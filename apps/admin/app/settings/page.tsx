"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormSection } from "../../components/ui/FormSection";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../../lib/auth-context";
import {
  getPlatformSettings,
  savePlatformSettings,
  type PlatformSettings,
} from "../../lib/admin-governance";

export default function SettingsPage() {
  const { hasRole, isDemoMode } = useAdminAuth();
  const canManage = hasRole(["SUPER_ADMIN", "MANAGEMENT"]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [currency, setCurrency] = useState<PlatformSettings["currency"]>("MYR");
  const [timezone, setTimezone] =
    useState<PlatformSettings["timezone"]>("Asia/Kuala_Lumpur");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setError("");
    try {
      const result = await getPlatformSettings();
      setSettings(result);
      setCurrency(result.currency);
      setTimezone(result.timezone);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Platform settings could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    Boolean(settings) &&
    (settings?.currency !== currency || settings?.timezone !== timezone);

  async function save() {
    if (!settings || !dirty) return;
    const approved = window.confirm(
      `Save academy defaults as ${currency} and ${timezone}? Existing plan and payment records are not converted or rewritten.`,
    );
    if (!approved) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await savePlatformSettings({ currency, timezone });
      setSettings(result);
      setCurrency(result.currency);
      setTimezone(result.timezone);
      setMessage(
        isDemoMode
          ? "Demo mode accepted the preview only. No persisted setting or audit record was changed."
          : result.changed
            ? "Platform defaults saved. An immutable audit event was appended."
            : "No setting values changed.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Settings were not saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <div style={{ width: "100%", maxWidth: 900, minWidth: 0 }}>
        <PageHeader
          title="Platform Settings & Verified Boundaries"
          subtitle="Persist a small allowlisted set of academy defaults. Secrets, payment credentials, and deployment configuration are intentionally excluded from this console."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Settings" },
          ]}
          actions={
            <Link href="/audit" className="audit-link">
              View audit trail
            </Link>
          }
        />

        {!canManage ? (
          <section className="restricted">
            <h2>Management access required</h2>
            <p>
              Platform defaults are restricted to Management and Super Admin
              staff with MFA-verified sessions.
            </p>
          </section>
        ) : (
          <>
            {isDemoMode && (
              <div className="notice demo" role="status">
                Demo mode previews these controls only. Save actions do not
                persist settings or audit records.
              </div>
            )}

            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="notice success" role="status">
                {message}
              </div>
            )}

            <FormSection
              title="Academy Locale & Currency Defaults"
              description="These defaults guide new operational records. Historical membership plans, invoices, and payments retain their stored currency snapshots."
            >
              <div className="settings-grid">
                <label>
                  Authoritative default currency
                  <select
                    value={currency}
                    disabled={loading || saving}
                    onChange={(event) =>
                      setCurrency(
                        event.target.value as PlatformSettings["currency"],
                      )
                    }
                  >
                    <option value="MYR">MYR — Malaysian Ringgit</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </label>

                <label>
                  Standard operational timezone
                  <select
                    value={timezone}
                    disabled={loading || saving}
                    onChange={(event) =>
                      setTimezone(
                        event.target.value as PlatformSettings["timezone"],
                      )
                    }
                  >
                    <option value="Asia/Kuala_Lumpur">
                      Asia/Kuala_Lumpur (UTC+8)
                    </option>
                    <option value="Asia/Singapore">
                      Asia/Singapore (UTC+8)
                    </option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
              </div>

              <div className="notice warning">
                <strong>No retroactive financial conversion.</strong> Changing
                the default currency does not change amounts or currency codes
                on existing plans, memberships, installments, or payments.
              </div>

              <div className="save-row">
                <div className="version-note">
                  {settings
                    ? `Configuration version ${settings.version} · last persisted ${new Date(settings.updatedAt).toLocaleString()}`
                    : loading
                      ? "Loading persisted configuration…"
                      : "Persisted configuration unavailable"}
                </div>
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading || saving || !dirty}
                  onClick={() => void save()}
                >
                  {saving ? "Saving…" : dirty ? "Save defaults" : "No changes"}
                </Button>
              </div>
            </FormSection>

            <FormSection
              title="Verified Request Boundaries"
              description="These statements describe only what this authenticated settings request proved. They are not synthetic uptime, infrastructure, or third-party service health claims."
            >
              <div className="status-grid">
                <article>
                  <span>AUTHORIZATION</span>
                  <strong>
                    {settings?.systemStatus.auth === "VERIFIED_SESSION"
                      ? "MFA-authorized admin request"
                      : "Waiting for request"}
                  </strong>
                  <p>
                    The API accepted this current Management/Super Admin
                    session.
                  </p>
                </article>
                <article>
                  <span>API REQUEST</span>
                  <strong>
                    {settings?.systemStatus.apiRequest === "AUTHENTICATED"
                      ? "Authenticated request succeeded"
                      : "Waiting for request"}
                  </strong>
                  <p>This does not claim global API uptime.</p>
                </article>
                <article>
                  <span>DATABASE READ</span>
                  <strong>
                    {settings?.systemStatus.database === "REACHABLE"
                      ? "Settings row read succeeded"
                      : "Waiting for request"}
                  </strong>
                  <p>
                    This proves only the database operation used by this page.
                  </p>
                </article>
              </div>
              <div className="boundary-time">
                Last checked:{" "}
                {settings?.systemStatus.checkedAt
                  ? new Date(settings.systemStatus.checkedAt).toLocaleString()
                  : "not yet checked"}
              </div>
            </FormSection>

            <FormSection
              title="Security Boundary"
              description="Sensitive infrastructure configuration belongs in managed deployment and secret stores, not in an application settings form."
            >
              <ul className="security-list">
                <li>
                  No API keys, passwords, database URLs, or webhook secrets.
                </li>
                <li>
                  No raw card details, payment credentials, or provider tokens.
                </li>
                <li>Every persisted settings change appends an audit event.</li>
                <li>
                  Allowed currencies and timezones are validated server-side.
                </li>
              </ul>
            </FormSection>
          </>
        )}

        <style jsx>{`
          .restricted {
            padding: 18px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .settings-grid,
          .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
            gap: 12px;
          }
          label {
            color: #334155;
            font-size: 0.84rem;
            font-weight: 700;
          }
          select {
            width: 100%;
            min-height: 44px;
            box-sizing: border-box;
            margin-top: 6px;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #ffffff;
            font: inherit;
          }
          .notice {
            padding: 11px 13px;
            border-radius: 9px;
            font-size: 0.83rem;
            line-height: 1.5;
          }
          .demo,
          .warning {
            background: #fffbeb;
            border: 1px solid #fde68a;
            color: #92400e;
          }
          .demo,
          .error,
          .success {
            margin-bottom: 14px;
          }
          .error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
          }
          .success {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
          }
          .save-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .version-note,
          .boundary-time {
            color: #64748b;
            font-size: 0.78rem;
          }
          .status-grid article {
            padding: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;
          }
          .status-grid span {
            display: block;
            margin-bottom: 5px;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.04em;
          }
          .status-grid strong {
            color: #166534;
          }
          .status-grid p {
            margin: 5px 0 0;
            color: #64748b;
            font-size: 0.78rem;
            line-height: 1.45;
          }
          .boundary-time {
            margin-top: 12px;
          }
          .security-list {
            margin: 0;
            padding-left: 20px;
            color: #334155;
            line-height: 1.7;
          }
          :global(.audit-link) {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            padding: 0 12px;
            box-sizing: border-box;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            color: #334155;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.82rem;
          }
          @media (max-width: 640px) {
            .save-row {
              align-items: stretch;
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
