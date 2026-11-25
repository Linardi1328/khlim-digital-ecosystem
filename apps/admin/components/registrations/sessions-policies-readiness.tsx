"use client";

import React from "react";
import Link from "next/link";
import { StatusBadge } from "../ui/StatusBadge";

export interface SessionsPoliciesReadinessProps {
  canApprovePolicies: boolean;
}

export function AdminRegistrationSessionsTab() {
  return (
    <div
      data-testid="admin-registration-sessions-panel"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div
        style={{
          backgroundColor: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: 12,
          padding: "18px 20px",
          color: "#78350F",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: "0.95rem" }}>
            Awaiting Codex F4 OpenAPI Response DTOs
          </strong>
          <StatusBadge status="DRAFT" size="sm" />
        </div>
        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.55 }}>
          Admin training-session list, draft creation, editing, publication, and
          closure controls are prepared against the RIC-190 handoff and will
          connect to <code>/v1/admin/academy/registration-sessions</code> once
          Codex publishes the corrected generated response DTOs in{" "}
          <code>packages/api-client/src/schema.d.ts</code>. Live Sports Garage
          sessions are not published during development.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Lifecycle &amp; Authoritative Capacity
          </h3>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.85rem",
              color: "#475569",
              lineHeight: 1.55,
            }}
          >
            Each registration session maps 1:1 to a dedicated programme offering
            isolated from legacy checkout memberships. Confirmed seat counts and
            configured capacity are always read from the backend.
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: "0.83rem",
              color: "#334155",
              lineHeight: 1.65,
            }}
          >
            <li>States: DRAFT → PUBLISHED → CLOSED (closed is terminal)</li>
            <li>
              Compare-and-set edits using server <code>expectedVersion</code>
            </li>
            <li>
              ISO weekday (1–7), MYT times, recurrence, and age cutoff rule
            </li>
          </ul>
        </div>

        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Explicit Publication Approvals Required
          </h3>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.85rem",
              color: "#475569",
              lineHeight: 1.55,
            }}
          >
            Before any draft session can be published to parents, staff must
            explicitly confirm both operational gates (never auto-checked):
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: "0.83rem",
              color: "#334155",
              lineHeight: 1.65,
            }}
          >
            <li>
              <code>scheduleApproved</code>: recurring venue booking, first
              training date, and time slots confirmed by operations
            </li>
            <li>
              <code>ageRuleApproved</code>: age cutoff rule and reference date
              confirmed by Academy management
            </li>
          </ul>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "14px 18px",
          fontSize: "0.84rem",
          color: "#475569",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          Existing reference selectors for Programmes and Venues remain
          available in their dedicated sections.
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/programmes"
            style={{
              color: "#B45309",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            View Programmes
          </Link>
          <Link
            href="/venues"
            style={{
              color: "#B45309",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            View Venues
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AdminConsentPoliciesTab({
  canApprovePolicies,
}: SessionsPoliciesReadinessProps) {
  return (
    <div
      data-testid="admin-consent-policies-panel"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div
        style={{
          backgroundColor: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: 12,
          padding: "18px 20px",
          color: "#78350F",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: "0.95rem" }}>
            Awaiting Codex F4 OpenAPI Response DTOs &amp; Approved Legal Copy
          </strong>
          <StatusBadge status="DRAFT" size="sm" />
        </div>
        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.55 }}>
          Consent policy list, draft version registration, approval, and
          retirement integrate with{" "}
          <code>/v1/admin/academy/registration-policies</code> once Codex
          publishes the finalized generated response types. No synthetic policy
          is approved in hosted staging or production.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Governance Authority (Your Current View)
          </h3>
          {canApprovePolicies ? (
            <p
              data-testid="policy-authority-approver"
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "#065F46",
                lineHeight: 1.55,
              }}
            >
              Your role (<strong>Super Admin / Management</strong>) is
              authorized to approve and retire consent policy versions with an
              active AAL2 MFA session once the generated API types and
              owner-approved legal texts are published.
            </p>
          ) : (
            <p
              data-testid="policy-authority-readonly"
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "#475569",
                lineHeight: 1.55,
              }}
            >
              <strong>Read-only visibility:</strong> Policy approval and
              retirement are restricted to AAL2 <strong>SUPER_ADMIN</strong> and{" "}
              <strong>MANAGEMENT</strong> accounts. Academy Admin accounts do
              not hold policy-approval authority.
            </p>
          )}
        </div>

        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Policy Metadata Contract
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: "0.83rem",
              color: "#334155",
              lineHeight: 1.65,
            }}
          >
            <li>
              Stores policy version, status (<code>DRAFT</code> /{" "}
              <code>APPROVED</code> / <code>RETIRED</code>), and per-locale
              references + SHA-256 hashes (<code>en</code>, <code>ms</code>,{" "}
              <code>zh-Hans</code>).
            </li>
            <li>
              Covers all 4 consent records: <code>GUARDIAN_AUTHORITY</code>,{" "}
              <code>REGISTRATION_PRIVACY</code>, <code>MARKETING</code>,{" "}
              <code>PHOTOGRAPHY</code>.
            </li>
            <li>
              Retiring the active approved policy immediately closes public
              registration on the backend.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
