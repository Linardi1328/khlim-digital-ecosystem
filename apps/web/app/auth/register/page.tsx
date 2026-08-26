"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";
import type { SupportedLocale } from "@khlim/i18n";

export default function RegisterPage() {
  const { t, locale, setLocale } = useI18n();
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>(locale);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setLocale(selectedLocale);
      const success = await register(email, password, fullName, selectedLocale);
      if (success) {
        router.push("/onboarding/guardian");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
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
      <div style={{ width: "100%", maxWidth: "480px" }}>
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
            <CardTitle>{t("auth.register.title")}</CardTitle>
            <CardDescription>{t("auth.register.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div style={{ marginBottom: "16px" }}>
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Input
                label={t("auth.register.fullName")}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Richie Lim"
              />

              <Input
                label={t("auth.register.email")}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guardian@example.com"
              />

              <Input
                label={t("auth.register.password")}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                helperText="Must be at least 8 characters long."
              />

              <Select
                label={t("auth.register.preferredLanguage")}
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value as SupportedLocale)}
                options={[
                  { label: "English", value: "en" },
                  { label: "Bahasa Melayu", value: "ms" },
                  { label: "简体中文 (Simplified Chinese)", value: "zh-Hans" },
                  { label: "繁體中文 (Traditional Chinese)", value: "zh-Hant" },
                  { label: "हिन्दी (Hindi)", value: "hi" },
                ]}
              />

              <p style={{ fontSize: "0.75rem", color: "#71717A", lineHeight: 1.4, margin: "4px 0" }}>
                {t("auth.register.termsNotice")}
              </p>

              <Button variant="primary" size="lg" type="submit" isLoading={isLoading} style={{ width: "100%" }}>
                {t("auth.register.submit")} →
              </Button>
            </form>
          </CardContent>

          <CardFooter style={{ justifyContent: "center", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "0.875rem", color: "#71717A" }}>
              {t("auth.register.haveAccount")}{" "}
              <Link href="/auth/login" style={{ color: "#18181B", fontWeight: 700, textDecoration: "none" }}>
                {t("nav.login")}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
