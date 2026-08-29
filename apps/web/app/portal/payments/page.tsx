"use client";

import React, { useEffect, useState } from "react";
import { apiService } from "../../../lib/api-service";
import { installmentStatusLabel } from "../../../lib/display-labels";
import { useFamily } from "../../../lib/family-context";
import { useI18n } from "../../../lib/i18n-context";
import type {
  MembershipBillingResponse,
  PaymentInstallmentRecord,
} from "../../../lib/types";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

export default function PaymentsPage() {
  const { t, formatCurrency, formatDate } = useI18n();
  const { activeChild } = useFamily();
  const [billings, setBillings] = useState<MembershipBillingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) {
      setBillings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiService
      .listAthleteMemberships(activeChild.id)
      .then(async (memberships) => {
        const values = await Promise.all(
          memberships.map(async (membership) => {
            try {
              return await apiService.getMembershipBilling(
                activeChild.id,
                membership.id,
              );
            } catch {
              return null;
            }
          }),
        );
        setBillings(
          values.filter(
            (value): value is MembershipBillingResponse => value !== null,
          ),
        );
      })
      .catch(() => setBillings([]))
      .finally(() => setLoading(false));
  }, [activeChild]);

  const installments: Array<{
    membershipId: string;
    installment: PaymentInstallmentRecord;
  }> = [];
  for (const billing of billings) {
    for (const installment of billing.paymentSchedule?.installments ?? []) {
      installments.push({ membershipId: billing.id, installment });
    }
  }

  return (
    <PortalShell>
      <div>
        <h1>{t("portal.payments.title")}</h1>
        <p style={{ color: "#64748b" }}>{t("portal.payments.subtitle")}</p>
        <Card>
          <CardHeader>
            <CardTitle>{t("portal.payments.upcoming")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>{t("portal.payments.loading")}</p>
            ) : installments.length === 0 ? (
              <p>
                {t("portal.payments.empty", {
                  name:
                    activeChild?.displayName ?? t("portal.common.thisAthlete"),
                })}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("portal.payments.installment")}</TableHead>
                    <TableHead>{t("portal.payments.due")}</TableHead>
                    <TableHead>{t("portal.payments.amount")}</TableHead>
                    <TableHead>{t("portal.payments.status")}</TableHead>
                    <TableHead>{t("portal.payments.attempts")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map(({ membershipId, installment }) => (
                    <TableRow key={installment.id}>
                      <TableCell>
                        #{installment.sequenceNumber}
                        <br />
                        <small>{membershipId}</small>
                      </TableCell>
                      <TableCell>{formatDate(installment.dueAt)}</TableCell>
                      <TableCell>
                        {formatCurrency(
                          installment.amountMinor / 100,
                          installment.currency,
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            installment.status === "PAID"
                              ? "success"
                              : installment.status === "FAILED" ||
                                  installment.status === "OVERDUE"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {installmentStatusLabel(installment.status, t)}
                        </Badge>
                      </TableCell>
                      <TableCell>{installment.payments.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
