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
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminShell>
      <div style={{ maxWidth: "800px" }}>
        <PageHeader
          title="Platform Settings & System Status"
          subtitle="Configure default regional formats, view API health connectivity, and review active credentials."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Settings" },
          ]}
        />

        {saved && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#ECFDF5",
              color: "#065F46",
              border: "1px solid #A7F3D0",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            ✓ Operational preferences saved.
          </div>
        )}

        <form onSubmit={handleSave}>
          <FormSection
            title="Academy Locale & Currency Standards"
            description="Authoritative regional defaults for pricing and scheduling."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
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
          </FormSection>

          <FormSection
            title="System & API Boundary Status"
            description="Operational health status of KHLIM infrastructure."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                  API GATEWAY
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#065F46",
                    marginTop: "2px",
                  }}
                >
                  ● Healthy (v1.0.0)
                </div>
              </div>
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                  SUPABASE AUTH
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#065F46",
                    marginTop: "2px",
                  }}
                >
                  ● Active (JWKS)
                </div>
              </div>
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                  POSTGRESQL DB
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#065F46",
                    marginTop: "2px",
                  }}
                >
                  ● Connected (Prisma 7)
                </div>
              </div>
            </div>
          </FormSection>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" size="md" type="submit">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
