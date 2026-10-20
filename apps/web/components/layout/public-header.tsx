"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "../../lib/i18n-context";
import { useAuth } from "../../lib/auth-context";
import { BrandLogo } from "./brand-logo";
import { LocaleSwitcher } from "./locale-switcher";
import { Button } from "../ui/button";
import { Sheet } from "../ui/sheet";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import styles from "./public-header.module.css";

function PublicHeaderView({
  campaignSource,
}: {
  campaignSource: string | null;
}) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: buildUrlWithSource("/", campaignSource), label: t("nav.home") },
    {
      href: buildUrlWithSource("/academy", campaignSource),
      label: t("nav.academy"),
    },
    {
      href: buildUrlWithSource("/programmes", campaignSource),
      label: t("nav.programmes"),
    },
    {
      href: buildUrlWithSource("/spotlight", campaignSource),
      label: t("nav.spotlight"),
    },
    {
      href: buildUrlWithSource("/interest", campaignSource),
      label: t("nav.registerInterest"),
    },
    {
      href: buildUrlWithSource("/about", campaignSource),
      label: t("nav.about"),
    },
    {
      href: buildUrlWithSource("/contact", campaignSource),
      label: t("nav.contact"),
    },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #E4E4E7",
      }}
    >
      <div className={`public-header-inner ${styles.inner}`}>
        <Link
          href={buildUrlWithSource("/", campaignSource)}
          className={`public-header-brand ${styles.brand}`}
        >
          <BrandLogo
            height={54}
            priority
            className={`public-header-logo ${styles.brandLogo}`}
          />
          <div className={styles.brandText}>
            <div
              className={`public-header-brand-name ${styles.brandName}`}
              style={{
                color: "#18181B",
                fontSize: "0.875rem",
                fontWeight: 800,
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              KHLIM
            </div>
            <div
              className={`public-header-brand-tagline ${styles.brandTagline}`}
              style={{
                marginTop: "4px",
                fontSize: "0.625rem",
                color: "#71717A",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {t("brand.tagline")}
            </div>
          </div>
        </Link>

        <nav className={`desktop-nav ${styles.desktopNav}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`desktop-nav-link ${styles.navLink}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={`public-header-actions ${styles.actions}`}>
          <div className={`public-header-locale ${styles.locale}`}>
            <LocaleSwitcher />
          </div>

          <div className="public-header-auth-actions">
            {isAuthenticated ? (
              <Link href="/portal/dashboard" style={{ textDecoration: "none" }}>
                <Button variant="secondary" size="sm">
                  🏀 {t("nav.portal")}
                </Button>
              </Link>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <Link href="/auth/login" style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="sm">
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link
                  href={buildUrlWithSource("/interest", campaignSource)}
                  style={{ textDecoration: "none" }}
                >
                  <Button variant="primary" size="sm">
                    {t("nav.registerInterest")}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t("layout.openMobileMenu")}
            style={{
              minWidth: "44px",
              minHeight: "44px",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid #E4E4E7",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "1.25rem",
              cursor: "pointer",
              flexShrink: 0,
            }}
            className={`mobile-menu-btn ${styles.mobileMenuBtn}`}
          >
            ☰
          </button>
        </div>
      </div>

      <div
        className={`public-header-mobile-quick-actions ${styles.mobileQuickActions}`}
      >
        {isAuthenticated ? (
          <Link
            href="/portal/dashboard"
            style={{ textDecoration: "none", flex: 1 }}
          >
            <Button
              variant="secondary"
              size="sm"
              style={{ width: "100%", minHeight: "44px" }}
            >
              🏀 {t("nav.portal")}
            </Button>
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              style={{ textDecoration: "none", flex: 1 }}
            >
              <Button
                variant="outline"
                size="sm"
                style={{ width: "100%", minHeight: "44px" }}
              >
                {t("nav.login")}
              </Button>
            </Link>
            <Link
              href={buildUrlWithSource("/interest", campaignSource)}
              style={{ textDecoration: "none", flex: 1 }}
            >
              <Button
                variant="primary"
                size="sm"
                style={{ width: "100%", minHeight: "44px" }}
              >
                {t("nav.registerInterest")}
              </Button>
            </Link>
          </>
        )}
      </div>

      <Sheet
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title={t("layout.navigationTitle")}
        position="right"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#18181B",
                textDecoration: "none",
                padding: "8px 0",
                borderBottom: "1px solid #F4F4F5",
                boxSizing: "border-box",
              }}
            >
              {link.label}
            </Link>
          ))}
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {isAuthenticated ? (
              <Link
                href="/portal/dashboard"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="secondary" size="md" style={{ width: "100%" }}>
                  🏀 {t("nav.portal")}
                </Button>
              </Link>
            ) : (
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="md" style={{ width: "100%" }}>
                  {t("nav.login")}
                </Button>
              </Link>
            )}
            <Link
              href={buildUrlWithSource("/interest", campaignSource)}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button
                variant="primary"
                size="md"
                style={{ width: "100%", minHeight: "44px" }}
              >
                {t("nav.registerInterest")}
              </Button>
            </Link>
            <Link
              href={buildUrlWithSource("/enrol", campaignSource)}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button
                variant="outline"
                size="md"
                style={{ width: "100%", minHeight: "44px" }}
              >
                {t("nav.register")}
              </Button>
            </Link>
          </div>
        </div>
      </Sheet>
    </header>
  );
}

function PublicHeaderWithSearchParams({
  initialSource,
}: {
  initialSource: string | null;
}) {
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const activeSource = initialSource ?? queryCampaign ?? storedCampaign;

  return <PublicHeaderView campaignSource={activeSource} />;
}

export function PublicHeader({
  campaignSource: initialCampaignSource = null,
}: {
  campaignSource?: string | null;
} = {}) {
  return (
    <Suspense
      fallback={<PublicHeaderView campaignSource={initialCampaignSource} />}
    >
      <PublicHeaderWithSearchParams initialSource={initialCampaignSource} />
    </Suspense>
  );
}
