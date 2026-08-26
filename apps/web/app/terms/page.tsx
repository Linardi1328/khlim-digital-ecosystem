"use client";

import React from "react";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "860px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ marginBottom: "32px" }}>
          <Badge variant="warning" size="sm">
            [DRAFT — Subject to Final Owner & Legal Approval]
          </Badge>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#18181B", margin: "12px 0 8px" }}>
            KHLIM Academy Terms of Service
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
            Draft Version: membership-mvp-v1 • For Platform Review
          </p>
        </div>

        <Card>
          <CardContent style={{ fontSize: "0.9375rem", color: "#3F3F46", lineHeight: 1.7 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B", marginTop: 0 }}>
              1. Academy Enrolment & Membership Agreement
            </h2>
            <p>
              Enrolment of an athlete in KHLIM Basketball Academy enters the guardian into an auditable membership agreement. The selected plan defines the commitment duration, billing frequency, and session entitlements.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              2. Recurring Billing & Payment Authorization
            </h2>
            <p>
              For plans with recurring installments, the guardian authorizes KHLIM to bill the agreed recurring amount via verified payment provider checkout handoff. KHLIM does not store raw credit card numbers or CVVs.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              3. Attendance & Schedule Modifications
            </h2>
            <p>
              Official session attendance is recorded and confirmed by academy coaches. In the event of venue closures, public holidays, or weather cancellations, KHLIM provides auditable term adjustments or replacement sessions.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              4. Code of Conduct & Safety
            </h2>
            <p>
              Athletes and guardians are expected to maintain sportsmanship, respect coaches and match officials, and follow facility rules.
            </p>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
