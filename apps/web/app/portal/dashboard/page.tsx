"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../../../lib/api-service";
import { useAuth } from "../../../lib/auth-context";
import { useFamily } from "../../../lib/family-context";
import { useI18n } from "../../../lib/i18n-context";
import {
  getPlanChargeMinor,
  type AthleteMembershipItem,
  type MembershipBillingResponse,
} from "../../../lib/types";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

export default function DashboardPage() {
  const { t, formatCurrency } = useI18n();
  const { guardianProfile } = useAuth();
  const { activeChild, athletes } = useFamily();
  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [billing, setBilling] = useState<MembershipBillingResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) {
      setMemberships([]);
      setBilling(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiService
      .listAthleteMemberships(activeChild.id)
      .then(async (items) => {
        setMemberships(items);
        const current =
          items.find((item) => item.status === "ACTIVE") ?? items[0];
        if (!current) {
          setBilling(null);
          return;
        }
        try {
          setBilling(
            await apiService.getMembershipBilling(activeChild.id, current.id),
          );
        } catch {
          setBilling(null);
        }
      })
      .catch(() => {
        setMemberships([]);
        setBilling(null);
      })
      .finally(() => setLoading(false));
  }, [activeChild]);

  const current =
    memberships.find((item) => item.status === "ACTIVE") ?? memberships[0];
  const nextInstallment = billing?.paymentSchedule?.installments.find(
    (item) => item.status === "SCHEDULED" || item.status === "PROCESSING",
  );
  const planAmount = current
    ? getPlanChargeMinor(current.membershipPlan)
    : null;

  return (
    <PortalShell>
      <div>
        <h1>
          {t("portal.dashboard.welcome", {
            name: guardianProfile?.displayName ?? "Guardian",
          })}
        </h1>
        <p style={{ color: "#64748b" }}>
          Selected athlete:{" "}
          <strong>{activeChild?.displayName ?? "None"}</strong> •{" "}
          {athletes.length} managed athlete(s)
        </p>
        {loading ? <p>Loading current membership state…</p> : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            marginTop: 24,
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("portal.dashboard.membershipStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant={current?.status === "ACTIVE" ? "success" : "warning"}
              >
                {current?.status ?? "NONE"}
              </Badge>
              <p>
                <strong>
                  {current?.programmeOffering.name ?? "No programme membership"}
                </strong>
              </p>
              <Link href="/portal/membership">
                <Button variant="outline" size="sm">
                  View memberships
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("portal.dashboard.nextTraining")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Detailed session scheduling is not available yet.</p>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                {current?.programmeOffering.startsOn
                  ? `Programme term starts ${current.programmeOffering.startsOn}.`
                  : "Programme timing will appear when configured."}
              </p>
              <Link href="/portal/schedule">
                <Button variant="outline" size="sm">
                  Programme timing
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("portal.dashboard.nextPayment")}</CardTitle>
            </CardHeader>
            <CardContent>
              {nextInstallment ? (
                <>
                  <strong>
                    {formatCurrency(
                      nextInstallment.amountMinor / 100,
                      nextInstallment.currency,
                    )}
                  </strong>
                  <p>Due {nextInstallment.dueAt}</p>
                </>
              ) : billing?.paymentSchedule ? (
                <p>No scheduled unpaid installment found.</p>
              ) : current && planAmount !== null ? (
                <p>
                  Billing schedule not created yet. Plan amount:{" "}
                  <strong>
                    {formatCurrency(
                      planAmount / 100,
                      current.membershipPlan.currency,
                    )}
                  </strong>
                  .
                </p>
              ) : (
                <p>No billing schedule.</p>
              )}
              <Link href="/portal/payments">
                <Button variant="outline" size="sm">
                  Billing details
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
