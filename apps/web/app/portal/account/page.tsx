"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";
import { apiService } from "../../../lib/api-service";
import type { SupportedLocale } from "@khlim/i18n";

export default function AccountPage() {
  const { t, locale, setLocale } = useI18n();
  const { account, guardianProfile, updateGuardianProfile, requestPasswordReset } = useAuth();

  const [displayName, setDisplayName] = useState(guardianProfile?.displayName || "");
  const [phone, setPhone] = useState(guardianProfile?.phone || "");
  const [emergencyName, setEmergencyName] = useState(guardianProfile?.emergencyContactName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(guardianProfile?.emergencyContactPhone || "");

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (guardianProfile) {
      setDisplayName(guardianProfile.displayName || "");
      setPhone(guardianProfile.phone || "");
      setEmergencyName(guardianProfile.emergencyContactName || "");
      setEmergencyPhone(guardianProfile.emergencyContactPhone || "");
    }
  }, [guardianProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await updateGuardianProfile({
        displayName,
        phone,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocaleChange = async (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    try {
      await apiService.updatePreferences({ preferredLocale: newLocale });
    } catch (err) {
      console.warn("Failed to persist language preference:", err);
    }
  };

  const handlePasswordReset = async () => {
    if (account?.email) {
      try {
        await requestPasswordReset(account.email);
        setPasswordSent(true);
        setTimeout(() => setPasswordSent(false), 4000);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Password recovery request failed";
        setError(message);
      }
    }
  };

  return (
    <PortalShell>
      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
            {t("portal.account.title")}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
            Manage your guardian contact information, preferred language, and account security.
          </p>
        </div>

        {savedSuccess && (
          <div style={{ marginBottom: "20px" }}>
            <Alert variant="success" title="Profile Saved">
              Your guardian contact details have been successfully updated on the server.
            </Alert>
          </div>
        )}

        {passwordSent && (
          <div style={{ marginBottom: "20px" }}>
            <Alert variant="info" title="Recovery Email Dispatched">
              A password reset link has been dispatched to {account?.email}.
            </Alert>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: "20px" }}>
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Guardian Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.25rem" }}>
                {t("portal.account.profile")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <Input
                  label="Registered Email (Immutable Account ID)"
                  disabled
                  value={account?.email || "guardian@example.com"}
                  helperText="Bound to your verified Supabase authentication identity."
                />

                <Input
                  label="Guardian Display Name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />

                <Input
                  label="Primary Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+60 12-345 6789"
                  helperText="Used for schedule notifications and emergency contact."
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Input
                    label="Emergency Contact Name"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                  />
                  <Input
                    label="Emergency Contact Phone"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: "8px" }}>
                  <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preferred Locale Settings */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.25rem" }}>
                {t("portal.account.language")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontSize: "0.875rem", color: "#64748B", margin: 0 }}>
                  Select your preferred language. Preferences are saved to your KHLIM account.
                </p>
                <Select
                  label="Application Language"
                  value={locale}
                  onChange={(e) => handleLocaleChange(e.target.value as SupportedLocale)}
                  options={[
                    { label: "English", value: "en" },
                    { label: "Bahasa Melayu", value: "ms" },
                    { label: "简体中文 (Simplified Chinese)", value: "zh-Hans" },
                    { label: "繁體中文 (Traditional Chinese)", value: "zh-Hant" },
                    { label: "हिन्दी (Hindi)", value: "hi" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Deactivation */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: "1.25rem" }}>
                {t("portal.account.security")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Account Password</div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>Protected via Supabase Auth</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePasswordReset}>
                    Send Reset Link
                  </Button>
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#DC2626" }}>Deactivate Account</div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                      [Draft Workflow] Submit an account deactivation or data export request.
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      alert("Account deactivation workflow is queued for administrative review.")
                    }
                  >
                    Request Deactivation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
