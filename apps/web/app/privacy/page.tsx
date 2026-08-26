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
          <Badge variant="neutral" size="sm">
            Child Safety & Data Privacy
          </Badge>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#18181B", margin: "12px 0 8px" }}>
            Privacy Policy & Child Protection
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
            Last Updated: August 2026 • Malaysian PDPA Compliant
          </p>
        </div>

        <Card>
          <CardContent style={{ fontSize: "0.9375rem", color: "#3F3F46", lineHeight: 1.7 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B", marginTop: 0 }}>
              1. Child Data Protection Principle
            </h2>
            <p>
              KHLIM is committed to the safety and privacy of minors participating in our academy programmes. Minor athletes are represented as managed profiles under authorized guardians. Children do not require independent email accounts or login credentials to be registered by their legal guardians.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              2. Data We Collect
            </h2>
            <p>
              We collect minimal operational data necessary for academy delivery: Guardian full name, mobile phone number, emergency contact details, athlete name, date of birth (for age-category bracket placement), and training attendance records.
            </p>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}>
              3. Data Retention & Account Deletion
            </h2>
            <p>
              Guardians retain full control over their family account. You may request profile data corrections, export your historical records, or initiate account deactivation through the parent portal settings.
            </p>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
