"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiService } from "../../../lib/api-service";
import { membershipStatusLabel } from "../../../lib/display-labels";
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
  const { t, formatCurrency, formatDate } = useI18n();
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
            name:
              guardianProfile?.displayName ?? t("portal.common.guardian"),
          })}
        </h1>
        <p style={{ color: "#64748b" }}>
          {t("portal.dashboard.selectedAthlete")}: {" "}
          <strong>
            {activeChild?.displayName ?? t("portal.common.none")}
          </strong>{" "}
          • {t("portal.dashboard.managedAthletes", { count: athletes.length })}
        </p>
        {loading ? <p>{t("portal.dashboard.loadingMembership")}</p> : null}
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
                {membershipStatusLabel(current?.status, t)}
              </Badge>
              <p>
                <strong>
                  {current?.programmeOffering.name ??
                    t("portal.dashboard.noMembership")}
                </strong>
              </p>
              <Link href="/portal/membership">
                <Button variant="outline" size="sm">
                  {t("portal.dashboard.viewMemberships")}
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("portal.dashboard.nextTraining")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{t("portal.dashboard.scheduleSummary")}</p>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                {current?.programmeOffering.startsOn
                  ? t("portal.dashboard.termStarts", {
                      date: formatDate(current.programmeOffering.startsOn),
                    })
                  : t("portal.dashboard.timingConfigured")}
              </p>
              <Link href="/portal/schedule">
                <Button variant="outline" size="sm">
                  {t("portal.dashboard.openSchedule")}
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
                  <p>
                    {t("portal.dashboard.due", {
                      date: formatDate(nextInstallment.dueAt),
                    })}
                  </p>
                </>
              ) : billing?.paymentSchedule ? (
                <p>{t("portal.dashboard.noUnpaidInstallment")}</p>
              ) : current && planAmount !== null ? (
                <p>
                  {t("portal.dashboard.billingScheduleNotCreated")} {" "}
                  <strong>
                    {formatCurrency(
                      planAmount / 100,
                      current.membershipPlan.currency,
                    )}
                  </strong>
                  .
                </p>
              ) : (
                <p>{t("portal.dashboard.noBillingSchedule")}</p>
              )}
              <Link href="/portal/payments">
                <Button variant="outline" size="sm">
                  {t("portal.dashboard.billingDetails")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
