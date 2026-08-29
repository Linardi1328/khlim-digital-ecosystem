"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiService } from "../../../lib/api-service";
import { useI18n } from "../../../lib/i18n-context";
import type {
  AthleteMembershipItem,
  MembershipBillingResponse,
} from "../../../lib/types";
import { PublicFooter } from "../../../components/layout/public-footer";
import { PublicHeader } from "../../../components/layout/public-header";
import { Alert } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

interface VerifiedState {
  membership: AthleteMembershipItem;
  billing: MembershipBillingResponse;
}

function ConfirmationContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const athleteId = searchParams.get("athleteId");
  const membershipId = searchParams.get("membershipId");
  const [state, setState] = useState<
    "loading" | "verified" | "error" | "missing"
  >("loading");
  const [verified, setVerified] = useState<VerifiedState | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!athleteId || !membershipId) {
      setState("missing");
      return;
    }
    setState("loading");
    setError("");
    try {
      const [billing, memberships] = await Promise.all([
        apiService.getMembershipBilling(athleteId, membershipId),
        apiService.listAthleteMemberships(athleteId),
      ]);
      const membership = memberships.find((item) => item.id === membershipId);
      if (!membership || billing.id !== membershipId) {
        throw new Error(t("enrol.confirmation.verifyMembershipError"));
      }
      setVerified({ membership, billing });
      setState("verified");
    } catch (caught) {
      setVerified(null);
      setError(
        caught instanceof Error
          ? caught.message
          : t("enrol.confirmation.verifyStateError"),
      );
      setState("error");
    }
  }, [athleteId, membershipId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = verified?.billing.status ?? verified?.membership.status;
  const active = status === "ACTIVE";
  const statusLabel =
    status === "ACTIVE"
      ? t("status.active")
      : status === "PENDING"
        ? t("status.pending")
        : status === "SUSPENDED"
          ? t("status.suspended")
          : status === "CANCELLED"
            ? t("status.cancelled")
            : status === "COMPLETED"
              ? t("status.completed")
              : status === "EXPIRED"
                ? t("status.expired")
                : (status ?? t("common.noData"));

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 700,
          margin: "40px auto",
          padding: "0 20px",
          boxSizing: "border-box",
        }}
      >
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          {state === "loading" ? (
            <p>{t("enrol.confirmation.verifying")}</p>
          ) : null}
          {state === "missing" ? (
            <Alert
              variant="warning"
              title={t("enrol.confirmation.missingTitle")}
            >
              {t("enrol.confirmation.missingBody")}
            </Alert>
          ) : null}
          {state === "error" ? (
            <div>
              <Alert
                variant="danger"
                title={t("enrol.confirmation.errorTitle")}
              >
                {error} {t("enrol.confirmation.safetyNotice")}
              </Alert>
              <div style={{ marginTop: 20 }}>
                <Button variant="outline" onClick={() => void load()}>
                  {t("enrol.confirmation.retry")}
                </Button>
              </div>
            </div>
          ) : null}
          {state === "verified" && verified ? (
            <>
              <Badge variant={active ? "success" : "warning"} size="md">
                {statusLabel}
              </Badge>
              <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>
                {active
                  ? t("enrol.confirmation.activeTitle")
                  : t("enrol.confirmation.pendingTitle")}
              </h1>
              <p style={{ color: "#71717a", lineHeight: 1.6 }}>
                {active
                  ? t("enrol.confirmation.activeBody")
                  : t("enrol.confirmation.pendingBody")}
              </p>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: 20,
                  borderRadius: 12,
                  textAlign: "left",
                  margin: "24px 0",
                }}
              >
                <p>
                  {t("enrol.confirmation.membershipId")}:{" "}
                  <strong>{verified.membership.id}</strong>
                </p>
                <p>
                  {t("enrol.confirmation.offering")}:{" "}
                  <strong>{verified.membership.programmeOffering.name}</strong>
                </p>
                <p>
                  {t("enrol.confirmation.plan")}:{" "}
                  <strong>{verified.membership.membershipPlan.name}</strong>
                </p>
                <p>
                  {t("enrol.confirmation.backendStatus")}:{" "}
                  <strong>{statusLabel}</strong>
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Link href="/portal/dashboard">
                  <Button variant="primary">
                    {t("enrol.confirmation.parentDashboard")}
                  </Button>
                </Link>
                <Link href="/portal/membership">
                  <Button variant="outline">
                    {t("enrol.confirmation.membershipDetails")}
                  </Button>
                </Link>
              </div>
            </>
          ) : null}
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function EnrolmentConfirmationPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          {t("enrol.confirmation.loading")}
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
