"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../../../../lib/api-service";
import type {
  AthleteMembershipItem,
  AthleteProfileResponse,
} from "../../../../lib/types";
import { PortalShell } from "../../../../components/portal/portal-shell";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = use(params);
  const [athlete, setAthlete] = useState<AthleteProfileResponse | null>(null);
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiService.getAthlete(athleteId),
      apiService.listAthleteMemberships(athleteId),
    ])
      .then(([profile, currentMemberships]) => {
        setAthlete(profile);
        setMemberships(currentMemberships);
      })
      .catch(() => {
        setAthlete(null);
        setMemberships([]);
      })
      .finally(() => setLoading(false));
  }, [athleteId]);

  return (
    <PortalShell>
      <div>
        <p>
          <Link href="/portal/players">← Back to players</Link>
        </p>
        {loading ? (
          <p>Loading player profile…</p>
        ) : !athlete ? (
          <p>Athlete not found or not authorized for this account.</p>
        ) : (
          <>
            <Card style={{ marginBottom: 24 }}>
              <CardContent>
                <h1>{athlete.displayName}</h1>
                <p>Date of birth: {athlete.dateOfBirth}</p>
                <p>Preferred language: {athlete.preferredLocale}</p>
                <Link
                  href={`/enrol?athleteId=${encodeURIComponent(athlete.id)}`}
                >
                  <Button variant="primary">Enrol in programme</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Memberships</CardTitle>
              </CardHeader>
              <CardContent>
                {memberships.length === 0 ? (
                  <p>No memberships recorded.</p>
                ) : (
                  memberships.map((membership) => (
                    <div
                      key={membership.id}
                      style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}
                    >
                      <strong>{membership.programmeOffering.name}</strong>{" "}
                      <Badge
                        variant={
                          membership.status === "ACTIVE" ? "success" : "warning"
                        }
                        size="sm"
                      >
                        {membership.status}
                      </Badge>
                      <div>{membership.membershipPlan.name}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PortalShell>
  );
}
