"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../../../../lib/api-service";
import { membershipStatusLabel } from "../../../../lib/display-labels";
import { useI18n } from "../../../../lib/i18n-context";
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

const localeNames: Record<string, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  hi: "हिन्दी",
};

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = use(params);
  const { t, formatDate } = useI18n();
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
          <Link href="/portal/players">{t("portal.player.back")}</Link>
        </p>
        {loading ? (
          <p>{t("portal.player.loading")}</p>
        ) : !athlete ? (
          <p>{t("portal.player.notFound")}</p>
        ) : (
          <>
            <Card style={{ marginBottom: 24 }}>
              <CardContent>
                <h1>{athlete.displayName}</h1>
                <p>
                  {t("portal.players.dateOfBirth")}: {formatDate(athlete.dateOfBirth)}
                </p>
                <p>
                  {t("portal.player.preferredLanguage")}: {localeNames[athlete.preferredLocale] ?? athlete.preferredLocale}
                </p>
                <Link
                  href={`/enrol?athleteId=${encodeURIComponent(athlete.id)}`}
                >
                  <Button variant="primary">
                    {t("portal.player.enrolProgramme")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("portal.player.memberships")}</CardTitle>
              </CardHeader>
              <CardContent>
                {memberships.length === 0 ? (
                  <p>{t("portal.player.noMemberships")}</p>
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
                        {membershipStatusLabel(membership.status, t)}
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
