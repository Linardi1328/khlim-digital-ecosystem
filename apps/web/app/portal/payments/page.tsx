"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "../../../lib/i18n-context";
import { useFamily } from "../../../lib/family-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { apiService } from "../../../lib/api-service";
import type { AthleteMembershipItem, MembershipBillingResponse, PaymentInstallmentRecord } from "../../../lib/types";

export default function PaymentsPage() {
  const { t, formatCurrency } = useI18n();
  const { activeChild } = useFamily();

  const [memberships, setMemberships] = useState<AthleteMembershipItem[]>([]);
  const [billingList, setBillingList] = useState<MembershipBillingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadPayments() {
      if (!activeChild?.id) {
        setMemberships([]);
        setBillingList([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const mems = await apiService.listAthleteMemberships(activeChild.id);
        setMemberships(mems);

        const billings = await Promise.all(
          mems.map(async (m) => {
            try {
              return await apiService.getMembershipBilling(activeChild.id, m.id);
            } catch {
              return null;
            }
          }),
        );
        setBillingList(billings.filter((b): b is MembershipBillingResponse => b !== null));
      } catch (err) {
        console.warn("Failed to load payments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [activeChild]);

  const allInstallments: Array<{
    membershipId: string;
    installment: PaymentInstallmentRecord;
  }> = [];

  billingList.forEach((b) => {
    b.paymentSchedule?.installments?.forEach((inst) => {
      allInstallments.push({
        membershipId: b.id,
        installment: inst,
      });
    });
  });

  return (
    <PortalShell>
      <div>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
            {t("portal.payments.title")}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: 0 }}>
            {t("portal.payments.subtitle")}
          </p>
        </div>

        {/* Installment Schedules */}
        <Card style={{ marginBottom: "32px" }}>
          <CardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle style={{ fontSize: "1.25rem" }}>
                {t("portal.payments.upcoming")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div style={{ padding: "20px", color: "#64748B" }}>Loading payment schedules...</div>
            ) : allInstallments.length === 0 ? (
              <div style={{ padding: "20px", color: "#64748B", textAlign: "center" }}>
                No active payment schedules found for {activeChild?.displayName || "this athlete"}.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allInstallments.map(({ membershipId, installment }) => (
                    <TableRow key={installment.id}>
                      <TableCell style={{ fontWeight: 600 }}>
                        Installment #{installment.sequenceNumber}
                      </TableCell>
                      <TableCell>{installment.dueOn}</TableCell>
                      <TableCell style={{ fontWeight: 700 }}>
                        {formatCurrency(installment.amountMinor / 100)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={installment.status === "PAID" ? "success" : "warning"}
                          size="sm"
                        >
                          {installment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {installment.payments?.length > 0 ? (
                          <span style={{ fontSize: "0.8125rem", color: "#065F46" }}>
                            {installment.payments.length} verified payment event(s)
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                            Scheduled for provider charge
                          </span>
                        )}
                      </TableCell>
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
