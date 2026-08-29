"use client";

import React from "react";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useI18n } from "../../lib/i18n-context";

export default function TermsPage() {
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
          maxWidth: "860px",
          minWidth: 0,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "32px", minWidth: 0 }}>
          <Badge
            variant="warning"
            size="sm"
            style={{
              maxWidth: "100%",
              whiteSpace: "normal",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            {t("legal.draftBadge")}
          </Badge>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              color: "#18181B",
              margin: "12px 0 8px",
            }}
          >
            {t("terms.title")}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
            {t("terms.version")}
          </p>
        </div>

        <Card>
          <CardContent
            style={{ fontSize: "0.9375rem", color: "#3F3F46", lineHeight: 1.7 }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#18181B",
                marginTop: 0,
              }}
            >
              {t("terms.section1.title")}
            </h2>
            <p>{t("terms.section1.body")}</p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              {t("terms.section2.title")}
            </h2>
            <p>{t("terms.section2.body")}</p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              {t("terms.section3.title")}
            </h2>
            <p>{t("terms.section3.body")}</p>

            <h2
              style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B" }}
            >
              {t("terms.section4.title")}
            </h2>
            <p>{t("terms.section4.body")}</p>
          </CardContent>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
