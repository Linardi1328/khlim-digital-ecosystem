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
          <Badge variant="neutral" size="sm">
            Legal & Membership Policies
          </Badge>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#18181B", margin: "12px 0 8px" }}>
            KHLIM Academy Terms & Conditions
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
            Last Updated: August 2026 • Version 2026.1
          </p>
        </div>

        <Card>
          <CardContent style={{ fontSize: "0.9375rem", color: "#3F3F46", lineHeight: 1.7 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B", marginTop: 0 }}>
              1. Academy Enrolment & Membership Agreement
            </h2>
            <p>
              By enrolling an athlete in KHLIM Basketball Academy, the parent or legal guardian enters into a binding membership agreement. The selected membership plan (e.g. 1-Month Trial, 3-Month Term, 6-Month Season) defines the commitment cycle, session allowance, and billing frequency.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              2. Recurring Billing & Payment Authorization
            </h2>
            <p>
              For plans with monthly recurring billing, the guardian authorizes KHLIM to charge the agreed monthly installment amount on the scheduled billing date via tokenized payment method. Payments are processed securely via external payment gateway providers. KHLIM never stores raw credit/debit card numbers or CVV codes.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              3. Attendance & Schedule Exceptions
            </h2>
            <p>
              Official session attendance is recorded and confirmed by authorized academy coaches. In the event of venue closures, public holidays, or weather cancellations, KHLIM will provide replacement sessions or auditable membership term adjustments.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              4. Code of Conduct & Safety
            </h2>
            <p>
              Athletes and guardians must respect coaches, referees, fellow teammates, and facility rules. Unsportsmanlike conduct, bullying, or dangerous behavior may result in membership suspension or termination.
            </p>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
