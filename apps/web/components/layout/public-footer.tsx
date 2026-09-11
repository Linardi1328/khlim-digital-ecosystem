"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import {
  getMissingCommerceBusinessFields,
  getPublicBusinessDetails,
} from "../../lib/business-details";
import { BrandLogo } from "./brand-logo";

const footerLinkStyle: React.CSSProperties = {
  color: "#A1A1AA",
  textDecoration: "none",
};

export function PublicFooter() {
  const { t } = useI18n();
  const business = getPublicBusinessDetails();
  const missingBusinessFields = getMissingCommerceBusinessFields(business);

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
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <BrandLogo height={44} />
            <div style={{ lineHeight: 1.05 }}>
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: "1rem",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                KHLIM
              </div>
              <div
                style={{
                  marginTop: "4px",
                  color: "#A1A1AA",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {t("brand.tagline")}
              </div>
            </div>
          </div>
          <p
            style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#A1A1AA" }}
          >
            {t("hero.subtitle")}
          </p>
          <address
            style={{
              marginTop: 16,
              color: "#A1A1AA",
              fontSize: "0.8125rem",
              lineHeight: 1.65,
              fontStyle: "normal",
            }}
          >
            <strong style={{ color: "#FFFFFF" }}>{business.legalName}</strong>
            {business.registrationNumber ? (
              <div>Company No.: {business.registrationNumber}</div>
            ) : null}
            {business.businessAddress ? <div>{business.businessAddress}</div> : null}
            {business.email ? (
              <div>
                Email: <a href={`mailto:${business.email}`} style={footerLinkStyle}>{business.email}</a>
              </div>
            ) : null}
            {business.phone ? (
              <div>
                Tel: <a href={`tel:${business.phone}`} style={footerLinkStyle}>{business.phone}</a>
              </div>
            ) : null}
            {missingBusinessFields.length > 0 ? (
              <div
                role="status"
                style={{ marginTop: 8, color: "#FDE68A", fontWeight: 700 }}
              >
                Business disclosure incomplete — online checkout is disabled.
              </div>
            ) : null}
          </address>
        </div>

        <div>
          <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px" }}>
            {t("nav.programmes")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.875rem" }}>
            <Link href="/programmes" style={footerLinkStyle}>{t("footer.currentOfferings")}</Link>
            <Link href="/enrol" style={footerLinkStyle}>{t("footer.academyEnrolment")}</Link>
            <Link href="/academy" style={footerLinkStyle}>{t("footer.academyApproach")}</Link>
          </div>
        </div>

        <div>
          <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px" }}>
            {t("nav.academy")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.875rem" }}>
            <Link href="/academy" style={footerLinkStyle}>{t("footer.developmentApproach")}</Link>
            <Link href="/programmes" style={footerLinkStyle}>{t("footer.venuesTerms")}</Link>
            <Link href="/about" style={footerLinkStyle}>{t("nav.about")}</Link>
            <Link href="/contact" style={footerLinkStyle}>{t("nav.contact")}</Link>
          </div>
        </div>

        <div>
          <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, margin: "0 0 16px" }}>
            Legal / Undang-undang
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.875rem" }}>
            <Link href="/terms" style={footerLinkStyle}>Terms & Conditions / Terma & Syarat</Link>
            <Link href="/privacy" style={footerLinkStyle}>Privacy Policy / Dasar Privasi</Link>
            <Link href="/cookies" style={footerLinkStyle}>Cookie Policy / Dasar Kuki</Link>
            <Link href="/refunds" style={footerLinkStyle}>Refund Policy / Dasar Bayaran Balik</Link>
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
          color: "#A1A1AA",
        }}
      >
        <div>{t("footer.copyright")}</div>
        <div>{t("footer.description")}</div>
      </div>
    </footer>
  );
}
