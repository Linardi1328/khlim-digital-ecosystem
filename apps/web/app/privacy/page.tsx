"use client";

import React from "react";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function PrivacyPage() {
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
            Privacy Policy & Child Data Protection
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
            Draft Copy • Malaysian PDPA Context & Child Protection Framework
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
              1. Child Data Protection Principles
            </h2>
            <p>
              KHLIM models minor athletes as managed profiles linked to
              authorized adult guardians. A child does not need a separate login
              or email account to be managed by their guardian.
            </p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              2. MVP Data Scope
            </h2>
            <p>
              The current platform foundation supports guardian account details,
              optional guardian phone information, athlete name and date of
              birth, language preference, programme and membership records, and
              payment or billing records returned through the KHLIM backend and
              configured payment provider. Later capabilities such as attendance
              or development records require separate implementation and review.
            </p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              3. Access, Correction & Requests
            </h2>
            <p>
              Guardians can access the managed athlete profiles linked to their
              account and update supported profile fields. The final process for
              privacy requests, deletion or account deactivation will be
              documented and approved before public launch; the current portal
              does not claim those unsupported requests have been submitted.
            </p>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
