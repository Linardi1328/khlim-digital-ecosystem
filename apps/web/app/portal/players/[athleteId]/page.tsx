"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "../../../../lib/i18n-context";
import { PortalShell } from "../../../../components/portal/portal-shell";
import { Button } from "../../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { apiService } from "../../../../lib/api-service";
import type { AthleteProfileResponse, AthleteMembershipItem } from "../../../../lib/types";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = use(params);
  const { t } = useI18n();

  const [athlete, setAthlete] = useState<AthleteProfileResponse | null>(null);
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [athData, memList] = await Promise.all([
          apiService.getAthlete(athleteId),
          apiService.listAthleteMemberships(athleteId),
        ]);
        setAthlete(athData);
        setMemberships(memList);
      } catch (err) {
        console.warn("Failed to load athlete profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [athleteId]);

  return (
    <PortalShell>
      <div>
        <div style={{ marginBottom: "20px" }}>
          <Link href="/portal/players" style={{ color: "#64748B", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
            ← Back to Players Directory
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "40px", color: "#64748B" }}>Loading player profile...</div>
        ) : !athlete ? (
          <div style={{ padding: "40px", color: "#64748B" }}>Athlete not found or unauthorized.</div>
        ) : (
          <>
            <Card style={{ marginBottom: "32px", padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "50%",
                      backgroundColor: "#FEF3C7",
                      color: "#92400E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "1.75rem",
                    }}
                  >
                    {athlete.displayName[0]}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "#0F172A" }}>
                        {athlete.displayName}
                      </h1>
                      <Badge variant="success" size="md">
                        ACTIVE
                      </Badge>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#64748B", marginTop: "4px" }}>
                      Date of Birth: <strong>{athlete.dateOfBirth}</strong> • {athlete.gender || "Youth Athlete"}
                    </div>
                  </div>
                </div>

                <Link href={`/enrol?athleteId=${athlete.id}`} style={{ textDecoration: "none" }}>
                  <Button variant="primary" size="md">
                    + Enrol in Programme
                  </Button>
                </Link>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: "1.125rem" }}>Enrolled Memberships</CardTitle>
              </CardHeader>
              <CardContent>
                {memberships.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {memberships.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: "14px",
                          borderRadius: "10px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0F172A" }}>
                            {m.programmeOffering?.name || "Academy Programme"}
                          </div>
                          <Badge
                            variant={m.status === "ACTIVE" ? "success" : "warning"}
                            size="sm"
                          >
                            {m.status}
                          </Badge>
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "#64748B", marginTop: "4px" }}>
                          Plan: {m.membershipPlan?.name || "Standard"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "2px" }}>
                          Contract ID: {m.id}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.875rem", color: "#64748B" }}>
                    No active memberships found for this player.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PortalShell>
  );
}
