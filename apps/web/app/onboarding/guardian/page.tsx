"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { useI18n } from "../../../lib/i18n-context";
import { Alert } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

export default function GuardianOnboardingPage() {
  const { t } = useI18n();
  const { guardianProfile, updateGuardianProfile, isAuthenticated, isLoading } =
    useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(
    guardianProfile?.displayName ?? "",
  );
  const [phone, setPhone] = useState(guardianProfile?.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login?redirect=/onboarding/guardian");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (guardianProfile) {
      setDisplayName(guardianProfile.displayName);
      setPhone(guardianProfile.phone ?? "");
    }
  }, [guardianProfile]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) {
      setError("Please provide a guardian display name.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await updateGuardianProfile({
        displayName: displayName.trim(),
        phone: phone.trim() || null,
      });
      router.push("/portal/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save guardian profile.",
      );
    } finally {
      setSubmitting(false);
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
      <Card style={{ width: "100%", maxWidth: 520 }}>
        <CardHeader>
          <CardTitle>{t("onboarding.guardian.title")}</CardTitle>
          <CardDescription>{t("onboarding.guardian.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginTop: error ? 16 : 0,
            }}
          >
            <Input
              label={t("onboarding.guardian.displayName")}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <Input
              label={t("onboarding.guardian.phone")}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              helperText="Optional contact number stored in your KHLIM guardian profile."
            />
            <Button
              variant="primary"
              size="lg"
              type="submit"
              isLoading={submitting}
              style={{ width: "100%" }}
            >
              {t("onboarding.guardian.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
