"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";

export default function LoginPage() {
  const { t } = useI18n();
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        router.push("/portal/dashboard");
      }
    } catch {
      setError("Sign in failed. Please verify your credentials and try again.");
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
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#18181B",
                color: "#F59E0B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.25rem",
              }}
            >
              K
            </div>
            <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#18181B", letterSpacing: "0.04em" }}>
              KHLIM
            </span>
          </Link>
        </div>

        <Card style={{ boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)", borderRadius: "16px" }}>
          <CardHeader>
            <CardTitle>{t("auth.login.title")}</CardTitle>
            <CardDescription>{t("auth.login.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div style={{ marginBottom: "16px" }}>
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input
                label={t("auth.login.email")}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guardian@example.com"
              />

              <div>
                <Input
                  label={t("auth.login.password")}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <div style={{ textAlign: "right", marginTop: "6px" }}>
                  <Link
                    href="/auth/forgot-password"
                    style={{ fontSize: "0.8125rem", color: "#F59E0B", textDecoration: "none", fontWeight: 600 }}
                  >
                    {t("auth.login.forgotPassword")}
                  </Link>
                </div>
              </div>

              <Button variant="primary" size="lg" type="submit" isLoading={isLoading} style={{ width: "100%" }}>
                {t("auth.login.submit")} →
              </Button>
            </form>
          </CardContent>

          <CardFooter style={{ justifyContent: "center", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.875rem", color: "#71717A" }}>
              {t("auth.login.noAccount")}{" "}
              <Link href="/auth/register" style={{ color: "#18181B", fontWeight: 700, textDecoration: "none" }}>
                {t("auth.login.createAccount")}
              </Link>
            </div>
            <Link href="/" style={{ fontSize: "0.8125rem", color: "#A1A1AA", textDecoration: "none" }}>
              ← Return to KHLIM Home
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
