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
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
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
            <span
              style={{ fontWeight: 900, fontSize: "1.25rem", color: "#FFFFFF" }}
            >
              KHLIM
            </span>
          </div>
          <p
            style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#A1A1AA" }}
          >
            {t("hero.subtitle")}
          </p>
          <div
            style={{
              marginTop: "16px",
              fontSize: "0.8125rem",
              color: "#71717A",
            }}
          >
            Malaysia • Current venue details are published with active programme
            offerings.
          </div>
        </div>

        <div>
          <h4
            style={{
              color: "#FFFFFF",
              fontSize: "1rem",
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            {t("nav.programmes")}
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <Link
              href="/programmes"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              Current Programme Offerings
            </Link>
            <Link
              href="/enrol"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              Academy Enrolment
            </Link>
            <Link
              href="/academy"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              Academy Approach
            </Link>
          </div>
        </div>

        <div>
          <h4
            style={{
              color: "#FFFFFF",
              fontSize: "1rem",
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            {t("nav.academy")}
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <Link
              href="/academy"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              Development Approach
            </Link>
            <Link
              href="/programmes"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              Venues & Programme Terms
            </Link>
            <Link
              href="/about"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("nav.about")}
            </Link>
            <Link
              href="/contact"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("nav.contact")}
            </Link>
          </div>
        </div>

        <div>
          <h4
            style={{
              color: "#FFFFFF",
              fontSize: "1rem",
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            {t("nav.portal")}
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <Link
              href="/portal/dashboard"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("nav.dashboard")}
            </Link>
            <Link
              href="/enrol"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("hero.cta.join")}
            </Link>
            <Link
              href="/terms"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              Draft Terms
            </Link>
            <Link
              href="/privacy"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              Draft Privacy Notice
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
        <div>© 2026 KHLIM Digital Sports Ecosystem.</div>
        <div>Basketball academy platform for families and staff.</div>
      </div>
    </footer>
  );
}
