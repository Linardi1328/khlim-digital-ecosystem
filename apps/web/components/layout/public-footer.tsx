"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";

export function PublicFooter() {
  const { t } = useI18n();

  return (
    <footer
      style={{
        backgroundColor: "#18181B",
        color: "#A1A1AA",
        padding: "64px 20px 32px",
        marginTop: "80px",
        borderTop: "1px solid #27272A",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "40px",
        }}
      >
        {/* Brand Column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "#F59E0B",
                color: "#18181B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.125rem",
              }}
            >
              K
            </div>
            <span style={{ fontWeight: 900, fontSize: "1.25rem", color: "#FFFFFF" }}>
              KHLIM
            </span>
          </div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#A1A1AA" }}>
            {t("hero.subtitle")}
          </p>
          <div style={{ marginTop: "16px", fontSize: "0.8125rem", color: "#71717A" }}>
            📍 Seri Kembangan & Cyberjaya, Selangor, Malaysia
          </div>
        </div>

        {/* Programmes Column */}
        <div>
          <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px" }}>
            {t("nav.programmes")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.875rem" }}>
            <Link href="/programmes" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              U9 Foundation Academy
            </Link>
            <Link href="/programmes" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              U12 Junior Academy
            </Link>
            <Link href="/programmes" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              U15 Youth Academy
            </Link>
            <Link href="/programmes" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              Advanced Elite Training
            </Link>
          </div>
        </div>

        {/* Academy & Community Column */}
        <div>
          <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px" }}>
            {t("nav.academy")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.875rem" }}>
            <Link href="/academy" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              Coaching Philosophy
            </Link>
            <Link href="/academy" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              Venues & Courts
            </Link>
            <Link href="/about" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              {t("nav.about")}
            </Link>
            <Link href="/contact" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              {t("nav.contact")}
            </Link>
          </div>
        </div>

        {/* Member & Legal Column */}
        <div>
          <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px" }}>
            {t("nav.portal")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.875rem" }}>
            <Link href="/portal/dashboard" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              {t("nav.dashboard")}
            </Link>
            <Link href="/enrol" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              {t("hero.cta.join")}
            </Link>
            <Link href="/terms" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              Terms of Service
            </Link>
            <Link href="/privacy" style={{ color: "#A1A1AA", textDecoration: "none" }}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1200px",
          margin: "48px auto 0",
          paddingTop: "24px",
          borderTop: "1px solid #27272A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          fontSize: "0.8125rem",
          color: "#71717A",
        }}
      >
        <div>© 2026 KHLIM Digital Sports Ecosystem. All rights reserved.</div>
        <div>Authoritative Malaysian Youth Sports & Academy Platform</div>
      </div>
    </footer>
  );
}
