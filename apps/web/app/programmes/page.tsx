"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { INITIAL_PROGRAMMES, INITIAL_OFFERINGS } from "../../lib/api-service";

export default function ProgrammesPage() {
  const { t } = useI18n();
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");

  const filteredProgrammes =
    selectedLevel === "ALL"
      ? INITIAL_PROGRAMMES
      : INITIAL_PROGRAMMES.filter((p) => p.id === selectedLevel);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", padding: "48px 20px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <Badge variant="brand" size="md">
            2026 Training Term
          </Badge>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 900, color: "#18181B", margin: "16px 0 12px" }}>
            {t("programmes.title")}
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#71717A", maxWidth: "680px", margin: "0 auto" }}>
            {t("programmes.subtitle")}
          </p>
        </div>

        {/* Level Filter Pills */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "40px", flexWrap: "wrap" }}>
          <Button
            variant={selectedLevel === "ALL" ? "primary" : "outline"}
            size="sm"
            onClick={() => setSelectedLevel("ALL")}
          >
            All Programmes
          </Button>
          {INITIAL_PROGRAMMES.map((p) => (
            <Button
              key={p.id}
              variant={selectedLevel === p.id ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedLevel(p.id)}
            >
              {p.name} (Age {p.minAge}–{p.maxAge})
            </Button>
          ))}
        </div>

        {/* Programmes Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
          {filteredProgrammes.map((programme) => {
            const offerings = INITIAL_OFFERINGS.filter((o) => o.programmeId === programme.id);

            return (
              <Card key={programme.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <CardHeader>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <Badge variant="brand" size="sm">
                        Age {programme.minAge} – {programme.maxAge} Years
                      </Badge>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#F59E0B" }}>
                        {programme.level}
                      </span>
                    </div>
                    <CardTitle>{programme.name}</CardTitle>
                    <CardDescription>{programme.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div style={{ marginTop: "16px", borderTop: "1px solid #F4F4F5", paddingTop: "16px" }}>
                      <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#27272A", margin: "0 0 10px" }}>
                        Available Time Slots & Locations:
                      </h4>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {offerings.map((off) => {
                          const spotsLeft = off.capacity - off.enrolledCount;
                          return (
                            <div
                              key={off.id}
                              style={{
                                padding: "10px 12px",
                                borderRadius: "8px",
                                backgroundColor: "#FAFAFA",
                                border: "1px solid #E4E4E7",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#18181B" }}>
                                  {off.dayOfWeek}s • {off.startTime} - {off.endTime}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#71717A" }}>
                                  📍 {off.venueName} ({off.court})
                                </div>
                              </div>
                              <Badge variant={spotsLeft > 3 ? "success" : "warning"} size="sm">
                                {t("programmes.spotsLeft", { count: spotsLeft })}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter>
                  <Link href={`/programmes/${offerings[0]?.id ?? programme.id}`} style={{ width: "100%", textDecoration: "none" }}>
                    <Button variant="primary" size="md" style={{ width: "100%" }}>
                      {t("programmes.viewDetails")} →
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
