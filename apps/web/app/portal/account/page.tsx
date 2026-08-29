"use client";

import React, { useEffect, useState } from "react";
import type { SupportedLocale } from "@khlim/i18n";
import { apiService } from "../../../lib/api-service";
import { useAuth } from "../../../lib/auth-context";
import { useI18n } from "../../../lib/i18n-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Alert } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";

export default function AccountPage() {
  const { t, locale, setLocale } = useI18n();
  const {
    account,
    guardianProfile,
    updateGuardianProfile,
    requestPasswordReset,
  } = useAuth();
  const [displayName, setDisplayName] = useState(
    guardianProfile?.displayName ?? "",
  );
  const [phone, setPhone] = useState(guardianProfile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDisplayName(guardianProfile?.displayName ?? "");
    setPhone(guardianProfile?.phone ?? "");
  }, [guardianProfile]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateGuardianProfile({
        displayName: displayName.trim(),
        phone: phone.trim() || null,
      });
      setNotice(t("portal.account.saved"));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("portal.account.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const changeLocale = async (next: SupportedLocale) => {
    const previous = locale;
    setLocale(next);
    setError("");
    try {
      await apiService.updatePreferences({ preferredLocale: next });
    } catch (caught) {
      setLocale(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : t("portal.account.languageError"),
      );
    }
  };

  const sendReset = async () => {
    if (!account?.email) {
      setError(t("portal.account.noEmail"));
      return;
    }
    setError("");
    try {
      await requestPasswordReset(account.email);
      setNotice(t("portal.account.resetAccepted"));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("portal.account.resetError"),
      );
    }
  };

  return (
    <PortalShell>
      <div style={{ maxWidth: 800 }}>
        <h1>{t("portal.account.title")}</h1>
        {notice ? <Alert variant="success">{notice}</Alert> : null}
        {error ? (
          <div style={{ marginTop: 12 }}>
            <Alert variant="danger">{error}</Alert>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 24,
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("portal.account.profile")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={saveProfile}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <Input
                  label={t("portal.account.registeredEmail")}
                  disabled
                  value={account?.email ?? t("portal.account.emailUnavailable")}
                />
                <Input
                  label={t("portal.account.displayName")}
                  required
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                <Input
                  label={t("portal.account.contactPhone")}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
                <Button variant="primary" type="submit" isLoading={saving}>
                  {t("common.save")}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("portal.account.language")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label={t("portal.account.applicationLanguage")}
                value={locale}
                onChange={(event) =>
                  changeLocale(event.target.value as SupportedLocale)
                }
                options={[
                  { label: "English", value: "en" },
                  { label: "Bahasa Melayu", value: "ms" },
                  { label: "简体中文", value: "zh-Hans" },
                  { label: "繁體中文", value: "zh-Hant" },
                  { label: "हिन्दी", value: "hi" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("portal.account.security")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>{t("portal.account.password")}</strong>
                  <div style={{ color: "#64748b", fontSize: "0.8125rem" }}>
                    {t("portal.account.managedBySupabase")}
                  </div>
                </div>
                <Button variant="outline" onClick={sendReset}>
                  {t("portal.account.sendReset")}
                </Button>
              </div>
              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  marginTop: 18,
                  paddingTop: 18,
                }}
              >
                <strong style={{ color: "#b91c1c" }}>
                  {t("portal.account.deactivation")}
                </strong>
                <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                  {t("portal.account.deactivationBody")}
                </p>
                <Button
                  variant="danger"
                  disabled
                  title={t("portal.account.deactivationTitle")}
                >
                  {t("portal.account.notAvailable")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
