"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { LocaleSwitcher } from "../../../components/layout/locale-switcher";
import { Alert } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { PasswordInput } from "../../../components/ui/password-input";
import {
  restoreRecoverySessionFromUrl,
  supabaseUpdatePassword,
} from "../../../lib/supabase-auth";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRecoveryReady(Boolean(restoreRecoverySessionFromUrl()));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("auth.reset.error.minimum"));
      return;
    }
    if (password !== confirmation) {
      setError(t("auth.reset.error.mismatch"));
      return;
    }

    setSaving(true);
    try {
      await supabaseUpdatePassword(password);
      setComplete(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("auth.reset.error.failed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        backgroundColor: "#f4f4f5",
        padding: "16px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div
          style={{
            minHeight: 44,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <LocaleSwitcher />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.reset.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {complete ? (
              <Alert variant="success" title={t("auth.reset.updatedTitle")}>
                {t("auth.reset.updatedBody")}{" "}
                <Link href="/auth/login">{t("auth.reset.returnSignIn")}</Link>
              </Alert>
            ) : !recoveryReady ? (
              <Alert variant="warning" title={t("auth.reset.unavailableTitle")}>
                {t("auth.reset.unavailableBody")}
              </Alert>
            ) : (
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {error ? <Alert variant="danger">{error}</Alert> : null}
                <PasswordInput
                  label={t("auth.reset.newPassword")}
                  showLabel={t("auth.password.show")}
                  hideLabel={t("auth.password.hide")}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <PasswordInput
                  label={t("auth.reset.confirmPassword")}
                  showLabel={t("auth.password.show")}
                  hideLabel={t("auth.password.hide")}
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                />
                <Button type="submit" variant="primary" isLoading={saving}>
                  {t("auth.reset.submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
