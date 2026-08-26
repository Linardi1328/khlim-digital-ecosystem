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
                No more WhatsApp chaos or lost schedules. Parents have their own portal with authoritative training calendars, attendance confirmation, and easy online renewals.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coaching Staff Section */}
        <div style={{ marginBottom: "64px" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#18181B", marginBottom: "24px", textAlign: "center" }}>
            Our Certified Coaching Staff
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {[
              {
                name: "Coach Marcus Wong",
                role: "Head Academy Coach",
                cred: "FIBA Level 2 • 12+ Years Coaching Youth & State Teams",
                bio: "Specializes in junior tactical development, shooting biomechanics, and competitive mindset.",
              },
              {
                name: "Coach Cheryl Tan",
                role: "Grassroots Director (U9 / U12)",
                cred: "National Youth Coach Certified • Former National Athlete",
                bio: "Passionate about youth agility, hand-eye coordination, and instilling love for the game.",
              },
              {
                name: "Coach Daniel Lee",
                role: "Strength & Agility Specialist",
                cred: "CSCS Certified • Elite Youth Performance Trainer",
                bio: "Focuses on injury prevention, lateral quickness, core stability, and athletic conditioning.",
              },
            ].map((c, i) => (
              <Card key={i}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#FEF3C7", color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 800, marginBottom: "16px" }}>
                  {c.name.split(" ")[1]?.[0] ?? "C"}
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 4px" }}>{c.name}</h3>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#F59E0B", marginBottom: "8px" }}>{c.role}</div>
                <div style={{ fontSize: "0.75rem", color: "#71717A", fontWeight: 600, marginBottom: "12px" }}>{c.cred}</div>
                <p style={{ fontSize: "0.875rem", color: "#52525B", lineHeight: 1.5, margin: 0 }}>{c.bio}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Venues Section */}
        <div style={{ backgroundColor: "#F4F4F5", borderRadius: "16px", padding: "40px 32px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#18181B", margin: "0 0 12px" }}>
            World-Class Training Venues
          </h2>
          <p style={{ fontSize: "1rem", color: "#71717A", maxWidth: "600px", margin: "0 auto 32px" }}>
            We operate in purpose-built indoor sports centres with FIBA-standard hardwood flooring, modern electronic scoreboards, and comfortable parent viewing galleries.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/programmes" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                View Academy Schedule & Venues →
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
