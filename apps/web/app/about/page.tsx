"use client";

import React from "react";
import Link from "next/link";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "900px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <Badge variant="brand" size="md">
            Our Direction & Vision
          </Badge>
          <h1 style={{ fontSize: "2.75rem", fontWeight: 900, color: "#18181B", margin: "16px 0 12px" }}>
            Building a Better Youth Sports Experience
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#71717A", lineHeight: 1.6 }}>
            KHLIM is developing a connected basketball academy experience that combines structured player development with clearer digital tools for families.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "1rem", color: "#3F3F46", lineHeight: 1.7 }}>
          <Card>
            <CardContent>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#18181B", marginTop: 0 }}>
                🏀 The KHLIM Approach
              </h2>
              <p>
                The academy is being designed around a practical goal: make basketball development easier for families to understand and easier for staff to operate consistently.
              </p>
              <p>
                The digital platform supports that goal with one family account, managed athlete profiles, programme information, memberships, billing visibility, and future development records.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#18181B" }}>
                🌐 One Shared Ecosystem
              </h2>
              <p>
                The platform is designed so future KHLIM services can reuse the same family identity and athlete history instead of creating disconnected accounts for every programme or event.
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
