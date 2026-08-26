"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../lib/i18n-context";
import { PublicHeader } from "../components/layout/public-header";
import { PublicFooter } from "../components/layout/public-footer";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { apiService } from "../lib/api-service";
import type { PublicOfferingItem } from "../lib/types";

export default function HomePage() {
  const { t, formatCurrency } = useI18n();
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then(setOfferings)
      .catch((err) => console.warn("Could not load offerings:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section
          style={{
            background: "linear-gradient(180deg, #18181B 0%, #121212 100%)",
            color: "#FFFFFF",
            padding: "80px 20px 100px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ maxWidth: "860px", margin: "0 auto", position: "relative", zIndex: 2 }}>
            <div style={{ display: "inline-block", marginBottom: "20px" }}>
              <Badge variant="brand" size="md">
                🏀 KHLIM Basketball Academy • {t("hero.badge")}
              </Badge>
            </div>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                margin: "0 0 24px",
                color: "#FFFFFF",
              }}
            >
              {t("hero.title")}
            </h1>

            <p
              style={{
                fontSize: "clamp(1.0625rem, 2vw, 1.25rem)",
                lineHeight: 1.6,
                color: "#D4D4D8",
                maxWidth: "680px",
                margin: "0 auto 36px",
              }}
            >
              {t("hero.subtitle")}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <Link href="/enrol" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="lg">
                  {t("hero.cta.join")} →
                </Button>
              </Link>
              <Link href="/programmes" style={{ textDecoration: "none" }}>
                <Button
                  variant="outline"
                  size="lg"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "#FFFFFF",
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                >
                  {t("hero.cta.explore")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Value Highlights */}
        <section
          style={{
            maxWidth: "1200px",
            margin: "-40px auto 60px",
            padding: "0 20px",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {[
              { icon: "🏆", title: t("hero.feature.coaching"), desc: "Structured progression and fundamental skill development." },
              { icon: "🏟️", title: t("hero.feature.venues"), desc: "Dedicated academy courts with verified scheduling." },
              { icon: "📱", title: t("hero.feature.portal"), desc: "Authoritative family schedule, attendance, and billing visibility." },
              { icon: "📈", title: t("hero.feature.development"), desc: "Clear milestone progression from grassroots to competitive." },
            ].map((f, i) => (
              <Card key={i} style={{ border: "1px solid #E4E4E7", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 6px" }}>{f.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "#71717A", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Live Programmes Preview */}
        <section style={{ maxWidth: "1200px", margin: "60px auto", padding: "0 20px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <Badge variant="neutral" size="md">
              {t("nav.programmes")}
            </Badge>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "12px 0 8px", color: "#18181B" }}>
              {t("programmes.title")}
            </h2>
            <p style={{ fontSize: "1.0625rem", color: "#71717A", maxWidth: "600px", margin: "0 auto" }}>
              {t("programmes.subtitle")}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#71717A" }}>
              Loading academy offerings from server...
            </div>
          ) : offerings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#71717A" }}>
              No open offerings currently scheduled. Check back soon.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "24px",
              }}
            >
              {offerings.map((off) => {
                const prg = off.programme;
                return (
                  <Card key={off.id} hoverable style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <CardHeader>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <Badge variant="brand" size="sm">
                            Age {prg?.minimumAge}–{prg?.maximumAge}
                          </Badge>
                          <span style={{ fontSize: "0.75rem", color: "#71717A", fontWeight: 600 }}>
                            {prg?.level}
                          </span>
                        </div>
                        <CardTitle>{off.name}</CardTitle>
                        <CardDescription>{prg?.description || prg?.name}</CardDescription>
                      </CardHeader>

                      <CardContent>
                        <div style={{ marginTop: "12px", borderTop: "1px solid #F4F4F5", paddingTop: "12px" }}>
                          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#52525B", marginBottom: "6px" }}>
                            Location & Schedule:
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "#71717A" }}>
                            📍 Venue: {off.venue?.name || "KHLIM Training Facility"}
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "#71717A", marginTop: "2px" }}>
                            🗓️ Term Starts: {off.startsOn}
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    <CardFooter>
                      <Link href={`/programmes/${off.id}`} style={{ width: "100%", textDecoration: "none" }}>
                        <Button variant="outline" size="md" style={{ width: "100%" }}>
                          {t("programmes.viewDetails")} →
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* CTA Banner */}
        <section style={{ maxWidth: "1200px", margin: "80px auto 40px", padding: "0 20px" }}>
          <div
            style={{
              backgroundColor: "#18181B",
              borderRadius: "20px",
              padding: "56px 32px",
              textAlign: "center",
              color: "#FFFFFF",
            }}
          >
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 16px" }}>
              Start your child&apos;s basketball journey with KHLIM
            </h2>
            <p style={{ fontSize: "1.0625rem", color: "#A1A1AA", maxWidth: "600px", margin: "0 auto 32px" }}>
              Enrol online through our guardian portal with server-authoritative membership contracts.
            </p>
            <Link href="/enrol" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                {t("hero.cta.join")}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
