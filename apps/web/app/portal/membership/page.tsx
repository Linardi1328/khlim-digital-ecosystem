"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../../../lib/api-service";
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
              Memberships for{" "}
              {activeChild?.displayName ?? "the selected athlete"}.
            </p>
          </div>
          <Link href="/enrol">
            <Button variant="primary">New enrolment</Button>
          </Link>
        </div>
        {loading ? (
          <p>Loading memberships…</p>
        ) : memberships.length === 0 ? (
          <Card style={{ padding: 32, textAlign: "center" }}>
            No membership contracts recorded.
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
                      {membership.status}
                    </Badge>
                    <h2>{membership.programmeOffering.name}</h2>
                    <p>
                      {membership.programmeOffering.venue?.name ??
                        "Venue not assigned"}
                    </p>
                  </div>
                  <div>
                    <strong>{membership.membershipPlan.name}</strong>
                    <p>
                      {amount === null
                        ? "Pricing configuration unavailable"
                        : `${formatCurrency(amount / 100, membership.membershipPlan.currency)} • ${membership.membershipPlan.billingFrequency === "UPFRONT" ? "upfront" : "per installment"}`}
                    </p>
                  </div>
                </div>
                {membership.status === "PENDING" ? (
                  <p style={{ color: "#b45309" }}>
                    Pending memberships are not treated as active until verified
                    backend billing state changes them.
                  </p>
                ) : null}
                <Link href="/portal/payments">
                  <Button variant="outline" size="sm">
                    View billing
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
