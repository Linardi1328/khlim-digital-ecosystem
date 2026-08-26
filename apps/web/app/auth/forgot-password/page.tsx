"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { requestPasswordReset, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Password recovery request failed.";
      setError(message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F4F4F5",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <Card style={{ boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)", borderRadius: "16px" }}>
          <CardHeader>
            <CardTitle>{t("auth.forgot.title")}</CardTitle>
            <CardDescription>{t("auth.forgot.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div style={{ marginBottom: "16px" }}>
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            {sent ? (
              <Alert variant="success" title="Recovery Link Dispatched">
                If an account exists for {email}, a secure password reset link has been dispatched via Supabase Auth.
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <Input
                  label={t("auth.login.email")}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guardian@example.com"
                />

                <Button variant="primary" size="lg" type="submit" isLoading={isLoading} style={{ width: "100%" }}>
                  {t("auth.forgot.submit")} →
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter style={{ justifyContent: "center" }}>
            <Link
              href="/auth/login"
              style={{ fontSize: "0.875rem", color: "#18181B", fontWeight: 600, textDecoration: "none" }}
            >
              ← {t("auth.forgot.backToLogin")}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
