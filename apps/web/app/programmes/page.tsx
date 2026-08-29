"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiService } from "../../lib/api-service";
import { useI18n } from "../../lib/i18n-context";
import type { PublicOfferingItem } from "../../lib/types";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function ProgrammesPage() {
  const { t, formatDate } = useI18n();
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("ALL");

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then(setOfferings)
      .catch(() => setOfferings([]))
      .finally(() => setLoading(false));
  }, []);

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          offerings
            .map((item) => item.programme.level)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [offerings],
  );
  const visible =
    level === "ALL"
      ? offerings
      : offerings.filter((item) => item.programme.level === level);

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Badge variant="brand">{t("programmes.catalogue")}</Badge>
          <h1>{t("programmes.title")}</h1>
          <p style={{ color: "#71717a" }}>{t("programmes.subtitle")}</p>
        </div>
        {levels.length > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <Button
              variant={level === "ALL" ? "primary" : "outline"}
              size="sm"
              onClick={() => setLevel("ALL")}
            >
              {t("programmes.allLevels")}
            </Button>
            {levels.map((item) => (
              <Button
                key={item}
                variant={level === item ? "primary" : "outline"}
                size="sm"
                onClick={() => setLevel(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        ) : null}
        {loading ? (
          <p style={{ textAlign: "center" }}>
            {t("programmes.loadingCurrent")}
          </p>
        ) : visible.length === 0 ? (
          <Card style={{ padding: 32, textAlign: "center" }}>
            {t("programmes.noMatching")}
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {visible.map((offering) => (
              <Card key={offering.id}>
                <CardHeader>
                  <CardTitle>{offering.name}</CardTitle>
                  <CardDescription>
                    {offering.programme.description ?? offering.programme.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>
                    {t("programmes.levelLabel")}:{" "}
                    {offering.programme.level ??
                      t("programmes.openDevelopment")}
                  </p>
                  <p>
                    {t("programmes.venueLabel")}:{" "}
                    {offering.venue?.name ?? t("common.toBeConfirmed")}
                  </p>
                  <p>
                    {t("programmes.termStartLabel")}:{" "}
                    {offering.startsOn
                      ? formatDate(offering.startsOn)
                      : t("common.toBeConfirmed")}
                  </p>
                  <Badge variant="neutral" size="sm">
                    {t("programmes.capacity")} {offering.capacity}
                  </Badge>
                </CardContent>
                <CardFooter>
                  <Link
                    href={`/programmes/${offering.id}`}
                    style={{ width: "100%" }}
                  >
                    <Button variant="primary" style={{ width: "100%" }}>
                      {t("programmes.viewDetails")}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
