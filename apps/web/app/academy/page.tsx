"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function AcademyPage() {
  const { t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "1200px", margin: "0 auto", padding: "48px 20px" }}>
        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <Badge variant="brand" size="md">
            {t("brand.academy")}
          </Badge>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 900, color: "#18181B", margin: "16px 0 12px" }}>
            The KHLIM Philosophy & Standard
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#71717A", maxWidth: "700px", margin: "0 auto" }}>
            Combining progressive basketball skill development, sportsmanship, and family transparency.
          </p>
        </div>

        {/* Pillars Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "64px" }}>
          <Card>
            <CardHeader>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏀</div>
              <CardTitle>Player-First Development</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: "0.9375rem", color: "#52525B", lineHeight: 1.6 }}>
                Every training drill is crafted to build fundamentals first—footwork, ball control, defensive balance, and court vision. We prioritize long-term athletic capability over short-term match pressure.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🛡️</div>
              <CardTitle>Character & Team Discipline</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: "0.9375rem", color: "#52525B", lineHeight: 1.6 }}>
                Basketball is our vehicle for building resilient leaders. Our players learn accountability, respect for coaches and referees, punctuality, and mutual encouragement.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📊</div>
              <CardTitle>Digital Parent Transparency</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: "0.9375rem", color: "#52525B", lineHeight: 1.6 }}>
                Parents have direct access to their authenticated portal with authoritative schedules, verified attendance records, and transparent billing.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coaching Standard Notice */}
        <div style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#18181B", marginBottom: "8px", textAlign: "center" }}>
            Certified Academy Coaching Framework
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "#71717A", textAlign: "center", maxWidth: "600px", margin: "0 auto 28px" }}>
            [Draft Coaching Framework — Specific coach assignments are finalized per term schedule]
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {[
              {
                role: "Head Academy Coaching Staff",
                standard: "FIBA / National Youth Certified",
                focus: "Tactical progression, shooting mechanics, and competitive game awareness.",
              },
              {
                role: "Grassroots Development Coaches",
                standard: "Youth Specialization Framework",
                focus: "Agility, hand-eye coordination, team camaraderie, and foundational motor skills.",
              },
              {
                role: "Conditioning & Movement Staff",
                standard: "Youth Athletic Performance Standard",
                focus: "Injury prevention, lateral speed, core strength, and safe athletic movement.",
              },
            ].map((c, i) => (
              <Card key={i}>
                <div style={{ width: "48px", height: "48px", borderRadius: "10px", backgroundColor: "#FEF3C7", color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "16px" }}>
                  🏀
                </div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 4px" }}>{c.role}</h3>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#F59E0B", marginBottom: "8px" }}>{c.standard}</div>
                <p style={{ fontSize: "0.875rem", color: "#52525B", lineHeight: 1.5, margin: 0 }}>{c.focus}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Venues Notice */}
        <div style={{ backgroundColor: "#F4F4F5", borderRadius: "16px", padding: "40px 32px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#18181B", margin: "0 0 12px" }}>
            Authoritative Academy Facilities
          </h2>
          <p style={{ fontSize: "1rem", color: "#71717A", maxWidth: "600px", margin: "0 auto 32px" }}>
            Training sessions operate at dedicated indoor sports venues. View current active schedules and venue courts directly in our programmes catalogue.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/programmes" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                View Active Programmes & Schedules →
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
