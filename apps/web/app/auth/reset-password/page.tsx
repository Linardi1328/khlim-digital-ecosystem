"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { Alert } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
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
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        backgroundColor: "#f4f4f5",
        padding: 24,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 460 }}>
        <CardHeader>
          <CardTitle>{t("auth.reset.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {complete ? (
            <Alert variant="success" title={t("auth.reset.updatedTitle")}>
              {t("auth.reset.updatedBody")} {" "}
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
              <Input
                label={t("auth.reset.newPassword")}
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <Input
                label={t("auth.reset.confirmPassword")}
                type="password"
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
  );
}
