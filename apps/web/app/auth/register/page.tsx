"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupportedLocale } from "@khlim/i18n";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";

export default function RegisterPage() {
  const { t, locale, setLocale } = useI18n();
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>(locale);
  const [error, setError] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!fullName.trim() || !email || password.length < 8) {
      setError("Enter your name, a valid email, and a password of at least 8 characters.");
      return;
    }

    try {
      setLocale(selectedLocale);
      const result = await register(
        email,
        password,
        fullName.trim(),
        selectedLocale,
      );
      if (result.authenticated) {
        router.push("/onboarding/guardian");
        return;
      }
      if (result.emailConfirmationRequired) {
        setConfirmationEmail(email);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", backgroundColor: "#f4f4f5", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.register.title")}</CardTitle>
            <CardDescription>{t("auth.register.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {confirmationEmail ? (
              <Alert variant="success" title="Verify your email to continue">
                Supabase requires email confirmation for {confirmationEmail}. Open the verification email, then sign in to finish your guardian profile.
              </Alert>
            ) : (
              <>
                {error ? <Alert variant="danger">{error}</Alert> : null}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: error ? 16 : 0 }}>
                  <Input label={t("auth.register.fullName")} required value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
                  <Input label={t("auth.register.email")} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                  <Input label={t("auth.register.password")} type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" helperText="Minimum 8 characters." />
                  <Select
                    label={t("auth.register.preferredLanguage")}
                    value={selectedLocale}
                    onChange={(event) => setSelectedLocale(event.target.value as SupportedLocale)}
                    options={[
                      { label: "English", value: "en" },
                      { label: "Bahasa Melayu", value: "ms" },
                      { label: "简体中文", value: "zh-Hans" },
                      { label: "繁體中文", value: "zh-Hant" },
                      { label: "हिन्दी", value: "hi" },
                    ]}
                  />
                  <p style={{ color: "#71717a", fontSize: "0.75rem", lineHeight: 1.5 }}>{t("auth.register.termsNotice")}</p>
                  <Button variant="primary" size="lg" type="submit" isLoading={isLoading} style={{ width: "100%" }}>
                    {t("auth.register.submit")}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
          <CardFooter style={{ justifyContent: "center" }}>
            <Link href="/auth/login">{t("auth.register.haveAccount")} {t("nav.login")}</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
