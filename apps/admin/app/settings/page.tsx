"use client";

import React, { useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { FormSection } from "../../components/ui/FormSection";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";

export default function SettingsPage() {
  const [currency, setCurrency] = useState("MYR");
  const [timezone, setTimezone] = useState("Asia/Kuala_Lumpur");

  return (
    <AdminShell>
      <div style={{ width: "100%", maxWidth: "800px", minWidth: 0 }}>
        <PageHeader
          title="Platform Settings & System Status"
          subtitle="Preview regional configuration and review integration readiness. Persistent settings and live health checks require backend support."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Settings" },
          ]}
        />

        <FormSection
          title="Academy Locale & Currency Standards"
          description="Preview the regional defaults that will be persisted after the settings API is implemented."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              minWidth: 0,
              gap: "12px",
            }}
          >
            <Select
              label="Authoritative Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { label: "MYR — Malaysian Ringgit", value: "MYR" },
                { label: "SGD — Singapore Dollar", value: "SGD" },
                { label: "USD — US Dollar", value: "USD" },
              ]}
            />

            <Select
              label="Standard Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                {
                  label: "Asia/Kuala_Lumpur (UTC+8)",
                  value: "Asia/Kuala_Lumpur",
                },
                { label: "Asia/Singapore (UTC+8)", value: "Asia/Singapore" },
                { label: "UTC (Coordinated Universal Time)", value: "UTC" },
              ]}
            />
          </div>

          <div
            role="status"
            style={{
              padding: "12px",
              border: "1px solid #FDE68A",
              borderRadius: "8px",
              backgroundColor: "#FFFBEB",
              color: "#92400E",
              fontSize: "0.8125rem",
              lineHeight: 1.5,
            }}
          >
            Settings persistence is not connected yet. Changes on this screen are
            local preview state only and are not saved to the KHLIM backend.
          </div>
        </FormSection>

        <FormSection
          title="System & API Boundary Status"
          description="This frontend preview does not perform authoritative infrastructure health checks."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              minWidth: 0,
              gap: "12px",
            }}
          >
            {[
              ["API GATEWAY", "Not verified in this preview"],
              ["SUPABASE AUTH", "Integration pending live verification"],
              ["POSTGRESQL DB", "Checked through backend operations only"],
            ].map(([label, status]) => (
              <div
                key={label}
                style={{
                  minWidth: 0,
                  padding: "12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                  {label}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#475569",
                    marginTop: "2px",
                    overflowWrap: "anywhere",
                  }}
                >
                  {status}
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="primary"
            size="md"
            type="button"
            disabled
            title="Settings persistence requires backend integration"
          >
            Save unavailable
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
