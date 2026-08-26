"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { apiService } from "../../lib/api-service";
import type { PublicOfferingItem } from "../../lib/types";

export default function ProgrammesPage() {
  const { t } = useI18n();
  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");

  useEffect(() => {
    apiService
      .getPublicOfferings()
      .then(setOfferings)
      .catch((err) => console.warn("Failed to load offerings:", err))
      .finally(() => setLoading(false));
  }, []);

  const levels = Array.from(
    new Set(offerings.map((o) => o.programme?.level).filter(Boolean)),
  );

  const filteredOfferings =
    selectedLevel === "ALL"
      ? offerings
      : offerings.filter((o) => o.programme?.level === selectedLevel);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", padding: "48px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <Badge variant="brand" size="md">
            Academy Programme Catalogue
          </Badge>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 900, color: "#18181B", margin: "16px 0 12px" }}>
            {t("programmes.title")}
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#71717A", maxWidth: "680px", margin: "0 auto" }}>
            {t("programmes.subtitle")}
          </p>
        </div>

        {/* Level Filter Pills */}
        {levels.length > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "40px", flexWrap: "wrap" }}>
            <Button
              variant={selectedLevel === "ALL" ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedLevel("ALL")}
            >
              All Levels
            </Button>
            {levels.map((lvl) => (
              <Button
                key={lvl}
                variant={selectedLevel === lvl ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedLevel(lvl)}
              >
                {lvl}
              </Button>
            ))}
          </div>
        )}

        {/* Offerings Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#71717A" }}>
            Loading available offerings from server...
          </div>
        ) : filteredOfferings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#71717A" }}>
            No programme offerings currently open. Please check back soon.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
            {filteredOfferings.map((offering) => {
              const prg = offering.programme;
              return (
                <Card key={offering.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <CardHeader>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <Badge variant="brand" size="sm">
                          Age {prg?.minimumAge} – {prg?.maximumAge} Years
                        </Badge>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#F59E0B" }}>
                          {prg?.level}
                        </span>
                      </div>
                      <CardTitle>{offering.name}</CardTitle>
                      <CardDescription>{prg?.description || prg?.name}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div style={{ marginTop: "16px", borderTop: "1px solid #F4F4F5", paddingTop: "16px" }}>
                        <div style={{ fontSize: "0.8125rem", color: "#71717A", marginBottom: "6px" }}>
                          📍 Venue: {offering.venue?.name || "KHLIM Training Facility"}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "#71717A", marginBottom: "6px" }}>
                          🗓️ Term Starts: {offering.startsOn}
                        </div>
                        <Badge variant="success" size="sm">
                          Capacity: {offering.capacity} Students
                        </Badge>
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter>
                    <Link href={`/programmes/${offering.id}`} style={{ width: "100%", textDecoration: "none" }}>
                      <Button variant="primary" size="md" style={{ width: "100%" }}>
                        {t("programmes.viewDetails")} →
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
