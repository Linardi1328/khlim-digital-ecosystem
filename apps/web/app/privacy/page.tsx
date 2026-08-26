"use client";

import React from "react";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "860px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ marginBottom: "32px" }}>
          <Badge variant="warning" size="sm">
            [DRAFT — Subject to Final Owner & Legal Approval]
          </Badge>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#18181B", margin: "12px 0 8px" }}>
            Privacy Policy & Child Data Protection
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
            Draft Copy • Malaysian PDPA Context & Child Protection Framework
          </p>
        </div>

        <Card>
          <CardContent style={{ fontSize: "0.9375rem", color: "#3F3F46", lineHeight: 1.7 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B", marginTop: 0 }}>
              1. Child Data Protection Principles
            </h2>
            <p>
              KHLIM safeguards minor athletes by modeling them as managed profiles linked to authorized adult guardians. Minor athletes do not require separate authentication identities to participate in academy programmes.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              2. Data Collected
            </h2>
            <p>
              We collect operational information necessary for academy execution: Guardian contact details, emergency contacts, athlete date of birth for age-category verification, and session attendance records.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              3. Data Access & Rights
            </h2>
            <p>
              Guardians maintain access to view and update their managed athlete profiles and can request account deactivation through their account settings.
            </p>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
