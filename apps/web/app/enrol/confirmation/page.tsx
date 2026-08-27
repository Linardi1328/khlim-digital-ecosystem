"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiService } from "../../../lib/api-service";
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
        throw new Error("The requested membership could not be verified.");
      }
      setVerified({ membership, billing });
      setState("verified");
    } catch (caught) {
      setVerified(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to verify enrolment state.",
      );
      setState("error");
    }
  }, [athleteId, membershipId]);

  useEffect(() => {
    load();
  }, [load]);

  const status = verified?.billing.status ?? verified?.membership.status;
  const active = status === "ACTIVE";

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
            <p>
              Verifying the current membership and billing state with KHLIM…
            </p>
          ) : null}
          {state === "missing" ? (
            <Alert variant="warning" title="Missing enrolment reference">
              This page requires an athlete and membership reference. Open the
              membership from your parent portal.
            </Alert>
          ) : null}
          {state === "error" ? (
            <div>
              <Alert variant="danger" title="Unable to verify enrolment state">
                {error} No payment or membership success is being assumed.
              </Alert>
              <div style={{ marginTop: 20 }}>
                <Button variant="outline" onClick={load}>
                  Retry verification
                </Button>
              </div>
            </div>
          ) : null}
          {state === "verified" && verified ? (
            <>
              <Badge variant={active ? "success" : "warning"} size="md">
                {status}
              </Badge>
              <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>
                {active
                  ? "Membership active"
                  : "Membership recorded — activation pending"}
              </h1>
              <p style={{ color: "#71717a", lineHeight: 1.6 }}>
                {active
                  ? "KHLIM has verified the backend membership as ACTIVE."
                  : "The backend currently reports this membership as pending or otherwise not active. Payment is not treated as successful until verified provider processing updates backend state."}
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
                  Membership ID: <strong>{verified.membership.id}</strong>
                </p>
                <p>
                  Offering:{" "}
                  <strong>{verified.membership.programmeOffering.name}</strong>
                </p>
                <p>
                  Plan:{" "}
                  <strong>{verified.membership.membershipPlan.name}</strong>
                </p>
                <p>
                  Backend status: <strong>{status}</strong>
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
                  <Button variant="primary">Parent dashboard</Button>
                </Link>
                <Link href="/portal/membership">
                  <Button variant="outline">Membership details</Button>
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
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          Loading confirmation…
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
