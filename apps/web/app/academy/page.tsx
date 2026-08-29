"use client";

import React from "react";
import Link from "next/link";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useI18n } from "../../lib/i18n-context";

export default function AcademyPage() {
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
          maxWidth: 1100,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Badge variant="brand">{t("academy.badge")}</Badge>
          <h1>{t("academy.title")}</h1>
          <p style={{ color: "#71717a", maxWidth: 680, margin: "0 auto" }}>
            {t("academy.intro")}
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <Card>
            <h2>{t("academy.playerDevelopment.title")}</h2>
            <p>{t("academy.playerDevelopment.body")}</p>
          </Card>
          <Card>
            <h2>{t("academy.teamStandards.title")}</h2>
            <p>{t("academy.teamStandards.body")}</p>
          </Card>
          <Card>
            <h2>{t("academy.familyVisibility.title")}</h2>
            <p>{t("academy.familyVisibility.body")}</p>
          </Card>
        </div>
        <Card style={{ marginTop: 32 }}>
          <h2>{t("academy.coaching.title")}</h2>
          <p>{t("academy.coaching.body")}</p>
          <h2>{t("academy.venues.title")}</h2>
          <p>{t("academy.venues.body")}</p>
          <Link href="/programmes">
            <Button variant="primary">{t("academy.programmesCta")}</Button>
          </Link>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
