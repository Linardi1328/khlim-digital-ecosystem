"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../lib/api-service";
import { useI18n } from "../lib/i18n-context";
import type { PublicOfferingItem } from "../lib/types";
import { PublicFooter } from "../components/layout/public-footer";
import { PublicHeader } from "../components/layout/public-header";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

function ageLabel(offering: PublicOfferingItem): string {
  const minimum = offering.programme.minimumAge;
  const maximum = offering.programme.maximumAge;
  if (minimum !== null && maximum !== null) return `Ages ${minimum}–${maximum}`;
  if (minimum !== null) return `Age ${minimum}+`;
  return "Age eligibility varies";
}

export default function HomePage() {
  const { t } = useI18n();
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then(setOfferings)
      .catch(() => setOfferings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <section
          style={{
            background: "linear-gradient(180deg, #18181b, #121212)",
            color: "white",
            padding: "80px 20px 96px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <Badge variant="brand" size="md">
              KHLIM Basketball Academy
            </Badge>
            <h1
              style={{
                fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
                lineHeight: 1.08,
                margin: "20px 0",
                fontWeight: 900,
              }}
            >
              {t("hero.title")}
            </h1>
            <p
              style={{
                color: "#d4d4d8",
                maxWidth: 680,
                margin: "0 auto 32px",
                fontSize: "1.125rem",
                lineHeight: 1.6,
              }}
            >
              {t("hero.subtitle")}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Link href="/enrol">
                <Button variant="primary" size="lg">
                  {t("hero.cta.join")}
                </Button>
              </Link>
              <Link href="/programmes">
                <Button variant="outline" size="lg">
                  {t("hero.cta.explore")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <section
          style={{ maxWidth: 1200, margin: "56px auto", padding: "0 20px" }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2>{t("programmes.title")}</h2>
            <p style={{ color: "#71717a" }}>{t("programmes.subtitle")}</p>
          </div>
          {loading ? (
            <p style={{ textAlign: "center" }}>
              Loading current academy offerings…
            </p>
          ) : offerings.length === 0 ? (
            <Card style={{ padding: 32, textAlign: "center" }}>
              No open programme offerings are currently published.
            </Card>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {offerings.slice(0, 6).map((offering) => (
                <Card key={offering.id}>
                  <CardHeader>
                    <Badge variant="brand" size="sm">
                      {ageLabel(offering)}
                    </Badge>
                    <CardTitle>{offering.name}</CardTitle>
                    <CardDescription>
                      {offering.programme.description ??
                        offering.programme.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Venue: {offering.venue?.name ?? "To be confirmed"}</p>
                    <p>Term start: {offering.startsOn ?? "To be confirmed"}</p>
                  </CardContent>
                  <CardFooter>
                    <Link
                      href={`/programmes/${offering.id}`}
                      style={{ width: "100%" }}
                    >
                      <Button variant="outline" style={{ width: "100%" }}>
                        {t("programmes.viewDetails")}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
