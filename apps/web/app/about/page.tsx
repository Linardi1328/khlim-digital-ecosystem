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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "900px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <Badge variant="brand" size="md">
            Our Story & Vision
          </Badge>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 900, color: "#18181B", margin: "16px 0 12px" }}>
            Building the Future of Youth Sports
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#71717A", lineHeight: 1.6 }}>
            KHLIM is building a comprehensive Digital Sports Ecosystem designed to empower young athletes, simplify parent management, and elevate basketball standards across Southeast Asia.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "1rem", color: "#3F3F46", lineHeight: 1.7 }}>
          <Card>
            <CardContent>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#18181B", marginTop: 0 }}>
                🏀 The KHLIM Origin
              </h2>
              <p>
                Founded by passionate basketball coaches and sports technology innovators, KHLIM began with a simple observation: youth academies in Malaysia suffered from fragmented communication, manual spreadsheets, and opaque player development pathways.
              </p>
              <p>
                We envisioned a unified sports ecosystem—starting with world-class basketball coaching and supported by an integrated digital platform that gives parents complete visibility over their children&apos;s journey, attendance, and progress.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#18181B", marginTop: 0 }}>
                🌐 One Shared Ecosystem
              </h2>
              <p>
                KHLIM is designed around a single family account. As our ecosystem expands to include 3x3 tournaments, holiday camps, competitive club teams, and additional sports, families will never need to create disconnected logins or lose historical athletic records.
              </p>
            </CardContent>
          </Card>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href="/programmes" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="lg">
                Explore Academy Programmes →
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
