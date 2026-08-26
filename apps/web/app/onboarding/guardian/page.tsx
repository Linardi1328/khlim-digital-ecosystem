"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../../../lib/i18n-context";
import { useAuth } from "../../../lib/auth-context";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Alert } from "../../../components/ui/alert";

export default function GuardianOnboardingPage() {
  const { t } = useI18n();
  const { guardianProfile, updateGuardianProfile } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(guardianProfile?.displayName ?? "Richie Lim");
  const [phone, setPhone] = useState(guardianProfile?.phone ?? "+60 12-345 6789");
  const [emergencyName, setEmergencyName] = useState(guardianProfile?.emergencyContactName ?? "Sarah Tan");
  const [emergencyPhone, setEmergencyPhone] = useState(guardianProfile?.emergencyContactPhone ?? "+60 19-876 5432");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateGuardianProfile({
        displayName,
        phone,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
      });
      router.push("/enrol");
    } finally {
      setIsSubmitting(false);
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
      <div style={{ width: "100%", maxWidth: "520px" }}>
        <Card style={{ boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)", borderRadius: "16px" }}>
          <CardHeader>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#FEF3C7",
                color: "#92400E",
                padding: "4px 10px",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                marginBottom: "8px",
                width: "fit-content",
              }}
            >
              Step 1 of 2: Family Setup
            </div>
            <CardTitle>{t("onboarding.guardian.title")}</CardTitle>
            <CardDescription>{t("onboarding.guardian.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <Input
                label={t("onboarding.guardian.displayName")}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Richie Lim"
              />

              <Input
                label={t("onboarding.guardian.phone")}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +60 12-345 6789"
                helperText="Used for schedule updates and coach emergency communication."
              />

              <div style={{ paddingTop: "12px", borderTop: "1px solid #F4F4F5" }}>
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "0 0 12px", color: "#18181B" }}>
                  Secondary Emergency Contact
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <Input
                    label="Emergency Contact Name"
                    required
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Sarah Tan (Spouse / Relative)"
                  />
                  <Input
                    label="Emergency Contact Phone"
                    required
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="e.g. +60 19-876 5432"
                  />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <Button variant="primary" size="lg" type="submit" isLoading={isSubmitting} style={{ width: "100%" }}>
                  {t("onboarding.guardian.submit")} →
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
