"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { BrandLogo } from "../../../components/layout/brand-logo";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/portal/dashboard";
  }
  return value;
}

function LoginContent() {
  const { t } = useI18n();
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = safeRedirect(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t("auth.login.error.required"));
      return;
    }

    try {
      await login(email, password);
      router.push(redirectPath);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("auth.login.error.failed"),
      );
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
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <Link href="/" aria-label={t("brand.academy")}>
            <BrandLogo size={78} priority />
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.login.title")}</CardTitle>
            <CardDescription>{t("auth.login.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginTop: error ? 16 : 0,
              }}
            >
              <Input
                label={t("auth.login.email")}
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
              <Input
                label={t("auth.login.password")}
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <div style={{ textAlign: "right" }}>
                <Link
                  href="/auth/forgot-password"
                  style={{ color: "#b45309", fontSize: "0.8125rem" }}
                >
                  {t("auth.login.forgotPassword")}
                </Link>
              </div>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={isLoading}
                style={{ width: "100%" }}
              >
                {t("auth.login.submit")}
              </Button>
            </form>
          </CardContent>
          <CardFooter style={{ justifyContent: "center" }}>
            <span style={{ fontSize: "0.875rem" }}>
              {t("auth.login.noAccount")}{" "}
              <Link href="/auth/register">{t("auth.login.createAccount")}</Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          {t("auth.login.loading")}
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
