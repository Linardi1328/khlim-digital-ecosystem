"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { useAuth } from "../../lib/auth-context";
import { BrandLogo } from "./brand-logo";
import { LocaleSwitcher } from "./locale-switcher";
import { Button } from "../ui/button";
import { Sheet } from "../ui/sheet";
import styles from "./public-header.module.css";

export function PublicHeader() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/academy", label: t("nav.academy") },
    { href: "/programmes", label: t("nav.programmes") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
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
      <div
        className={`public-header-inner ${styles.inner}`}
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          height: "70px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          className={`public-header-brand ${styles.brand}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <BrandLogo
            height={42}
            priority
            className={`public-header-logo ${styles.brandLogo}`}
          />
          <div style={{ minWidth: 0, lineHeight: 1.05 }}>
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

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#3F3F46",
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div
          className={`public-header-actions ${styles.actions}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexShrink: 0,
          }}
        >
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
                <Link href="/enrol" style={{ textDecoration: "none" }}>
                  <Button variant="primary" size="sm">
                    {t("nav.register")}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t("layout.openMobileMenu")}
            style={{
              display: "none",
              background: "transparent",
              border: "1px solid #E4E4E7",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "1.25rem",
              cursor: "pointer",
              flexShrink: 0,
            }}
            className="mobile-menu-btn"
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
            <Button variant="secondary" size="sm" style={{ width: "100%" }}>
              🏀 {t("nav.portal")}
            </Button>
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              style={{ textDecoration: "none", flex: 1 }}
            >
              <Button variant="outline" size="sm" style={{ width: "100%" }}>
                {t("nav.login")}
              </Button>
            </Link>
            <Link href="/enrol" style={{ textDecoration: "none", flex: 1 }}>
              <Button variant="primary" size="sm" style={{ width: "100%" }}>
                {t("nav.register")}
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
          <div className="public-mobile-locale">
            <LocaleSwitcher />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#18181B",
                textDecoration: "none",
                padding: "8px 0",
                borderBottom: "1px solid #F4F4F5",
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
            <Link href="/enrol" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="md" style={{ width: "100%" }}>
                {t("hero.cta.join")}
              </Button>
            </Link>
          </div>
        </div>
      </Sheet>
    </header>
  );
}
