"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../../../lib/api-service";
import { membershipStatusLabel } from "../../../lib/display-labels";
import { useFamily } from "../../../lib/family-context";
import { useI18n } from "../../../lib/i18n-context";
import {
  getPlanChargeMinor,
  type AthleteMembershipItem,
} from "../../../lib/types";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

export default function MembershipPage() {
  const { t, formatCurrency } = useI18n();
  const { activeChild } = useFamily();
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiService
      .listAthleteMemberships(activeChild.id)
      .then(setMemberships)
      .catch(() => setMemberships([]))
      .finally(() => setLoading(false));
  }, [activeChild]);

  return (
    <PortalShell>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1>{t("portal.membership.title")}</h1>
            <p style={{ color: "#64748b" }}>
              {t("portal.membership.forAthlete", {
                name:
                  activeChild?.displayName ?? t("portal.common.selectedAthlete"),
              })}
            </p>
          </div>
          <Link href="/enrol">
            <Button variant="primary">
              {t("portal.membership.newEnrolment")}
            </Button>
          </Link>
        </div>
        {loading ? (
          <p>{t("portal.membership.loading")}</p>
        ) : memberships.length === 0 ? (
          <Card style={{ padding: 32, textAlign: "center" }}>
            {t("portal.membership.empty")}
          </Card>
        ) : (
          memberships.map((membership) => {
            const amount = getPlanChargeMinor(membership.membershipPlan);
            return (
              <Card key={membership.id} style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <Badge
                      variant={
                        membership.status === "ACTIVE" ? "success" : "warning"
                      }
                    >
                      {membershipStatusLabel(membership.status, t)}
                    </Badge>
                    <h2>{membership.programmeOffering.name}</h2>
                    <p>
                      {membership.programmeOffering.venue?.name ??
                        t("portal.common.venueNotAssigned")}
                    </p>
                  </div>
                  <div>
                    <strong>{membership.membershipPlan.name}</strong>
                    <p>
                      {amount === null
                        ? t("portal.common.pricingUnavailable")
                        : `${formatCurrency(amount / 100, membership.membershipPlan.currency)} • ${membership.membershipPlan.billingFrequency === "UPFRONT" ? t("portal.common.upfront") : t("portal.common.perInstallment")}`}
                    </p>
                  </div>
                </div>
                {membership.status === "PENDING" ? (
                  <p style={{ color: "#b45309" }}>
                    {t("portal.membership.pendingSafety")}
                  </p>
                ) : null}
                <Link href="/portal/payments">
                  <Button variant="outline" size="sm">
                    {t("portal.membership.viewBilling")}
                  </Button>
                </Link>
              </Card>
            );
          })
        )}
      </div>
    </PortalShell>
  );
}
