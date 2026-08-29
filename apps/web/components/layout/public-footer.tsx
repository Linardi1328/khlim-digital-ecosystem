"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { BrandLogo } from "./brand-logo";

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
          <div style={{ marginBottom: "16px" }}>
            <BrandLogo height={36} />
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
            {t("footer.locationNote")}
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
              {t("footer.currentOfferings")}
            </Link>
            <Link
              href="/enrol"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("footer.academyEnrolment")}
            </Link>
            <Link
              href="/academy"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("footer.academyApproach")}
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
              {t("footer.developmentApproach")}
            </Link>
            <Link
              href="/programmes"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("footer.venuesTerms")}
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
              {t("footer.draftTerms")}
            </Link>
            <Link
              href="/privacy"
              style={{ color: "#A1A1AA", textDecoration: "none" }}
            >
              {t("footer.draftPrivacy")}
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
        <div>{t("footer.copyright")}</div>
        <div>{t("footer.description")}</div>
      </div>
    </footer>
  );
}
