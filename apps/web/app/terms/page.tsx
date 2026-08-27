"use client";

import React from "react";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function TermsPage() {
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "860px",
          minWidth: 0,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "32px", minWidth: 0 }}>
          <Badge
            variant="warning"
            size="sm"
            style={{
              maxWidth: "100%",
              whiteSpace: "normal",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            [DRAFT — Subject to Final Owner & Legal Approval]
          </Badge>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              color: "#18181B",
              margin: "12px 0 8px",
            }}
          >
            KHLIM Academy Terms of Service
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
            Draft Version: membership-mvp-v1 • For Platform Review
          </p>
        </div>

        <Card>
          <CardContent
            style={{ fontSize: "0.9375rem", color: "#3F3F46", lineHeight: 1.7 }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#18181B",
                marginTop: 0,
              }}
            >
              1. Academy Enrolment & Membership Agreement
            </h2>
            <p>
              Enrolment creates a membership record for the selected athlete,
              programme offering, and membership plan. The final legally
              approved agreement will define the applicable service period,
              commitment, billing terms, eligibility, and benefits before public
              launch.
            </p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              2. Recurring Billing & Payment Authorization
            </h2>
            <p>
              Where a plan uses recurring installments, the guardian must
              explicitly authorize the billing schedule before KHLIM creates a
              payment-provider checkout. KHLIM does not render or store raw card
              numbers or CVVs, and membership activation is based on verified
              backend payment state rather than the browser redirect alone.
            </p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              3. Programme Information & Schedule Changes
            </h2>
            <p>
              The current MVP can show authoritative programme-offering term
              dates and venue information supplied by the KHLIM backend.
              Detailed session scheduling, cancellations, replacement sessions,
              attendance, and term-adjustment rules are later operational
              capabilities and are not promised by this draft page.
            </p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              4. Conduct, Safety & Final Approval
            </h2>
            <p>
              Final academy conduct, safety, cancellation, refund, privacy, and
              recurring-billing terms require KHLIM management and legal review
              before the public launch. This draft is present for product-flow
              testing only and is not represented as the final customer
              contract.
            </p>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
