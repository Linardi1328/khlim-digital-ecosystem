"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "900px",
          minWidth: 0,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <Badge variant="brand" size="md">
            {t("about.eyebrow")}
          </Badge>
          <h1
            style={{
              fontSize: "2.75rem",
              fontWeight: 900,
              color: "#18181B",
              margin: "16px 0 12px",
            }}
          >
            {t("about.title")}
          </h1>
          <p
            style={{ fontSize: "1.125rem", color: "#71717A", lineHeight: 1.6 }}
          >
            {t("about.intro")}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            minWidth: 0,
            fontSize: "1rem",
            color: "#3F3F46",
            lineHeight: 1.7,
          }}
        >
          <Card>
            <CardContent>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#18181B",
                  marginTop: 0,
                }}
              >
                🏀 {t("about.approachTitle")}
              </h2>
              <p>{t("about.approachBody1")}</p>
              <p>{t("about.approachBody2")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#18181B",
                }}
              >
                🌐 {t("about.ecosystemTitle")}
              </h2>
              <p>{t("about.ecosystemBody")}</p>
            </CardContent>
          </Card>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href="/programmes" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                {t("about.cta")}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
