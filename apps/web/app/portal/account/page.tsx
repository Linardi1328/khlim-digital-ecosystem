"use client";

import React, { useState } from "react";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";
import type { SupportedLocale } from "@khlim/i18n";

export default function AccountPage() {
  const { t, locale, setLocale } = useI18n();
  const { user, guardianProfile, updateGuardianProfile } = useAuth();

  const [displayName, setDisplayName] = useState(guardianProfile?.displayName ?? "Richie Lim");
  const [phone, setPhone] = useState(guardianProfile?.phone ?? "+60 12-345 6789");
  const [emergencyName, setEmergencyName] = useState(guardianProfile?.emergencyContactName ?? "Sarah Tan");
  const [emergencyPhone, setEmergencyPhone] = useState(guardianProfile?.emergencyContactPhone ?? "+60 19-876 5432");

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateGuardianProfile({
        displayName,
        phone,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
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
            <Alert variant="success" title="Profile Updated">
              Your guardian contact details have been successfully saved.
            </Alert>
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
                  value={user?.email ?? "guardian@example.com"}
                  helperText="Bound to your verified Supabase authentication identity."
                />

                <Input
                  label="Guardian Display Name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />

                <Input
                  label="WhatsApp Mobile Number"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  helperText="Used for automated training schedule change alerts."
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
                  Each guardian and player account can choose their preferred language independently.
                </p>
                <Select
                  label="Application Language"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as SupportedLocale)}
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

          {/* Account Security & Deletion Request */}
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
                  <Button variant="outline" size="sm" onClick={() => alert("Password reset email sent.")}>
                    Change Password
                  </Button>
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#DC2626" }}>Deactivate Account</div>
                    <div style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                      Submit an account deactivation or data export request under PDPA.
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => alert("Account deactivation request logged.")}>
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
