"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "../../../lib/i18n-context";
import { PortalShell } from "../../../components/portal/portal-shell";
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Dialog } from "../../../components/ui/dialog";
import { apiService } from "../../../lib/api-service";
import type { PaymentInstallment, PaymentTransaction } from "../../../lib/types";

export default function PaymentsPage() {
  const { t, formatCurrency } = useI18n();
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    apiService.getPaymentInstallments().then(setInstallments);
    apiService.getPaymentTransactions().then(setTransactions);
  }, []);

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

        {/* Payment Schedules & Upcoming Installments */}
        <Card style={{ marginBottom: "32px" }}>
          <CardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle style={{ fontSize: "1.25rem" }}>
                {t("portal.payments.upcoming")}
              </CardTitle>
              <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                Default: Visa •••• 4242
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt / Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell style={{ fontWeight: 600 }}>
                      Installment #{inst.installmentNumber}
                    </TableCell>
                    <TableCell>{inst.dueDate}</TableCell>
                    <TableCell style={{ fontWeight: 700 }}>
                      {formatCurrency(inst.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inst.status === "PAID" ? "success" : "neutral"} size="sm">
                        {inst.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {inst.status === "PAID" ? (
                        <span style={{ fontSize: "0.8125rem", color: "#065F46", fontWeight: 600 }}>
                          ✓ Paid on {inst.paidAt}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.8125rem", color: "#64748B" }}>
                          Auto-bill on due date
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transaction History & Receipts */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: "1.25rem" }}>
              {t("portal.payments.history")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell style={{ fontWeight: 700, color: "#F59E0B" }}>
                      {tx.receiptNumber}
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>{tx.paidAt}</TableCell>
                    <TableCell>{tx.paymentMethod}</TableCell>
                    <TableCell style={{ fontWeight: 700 }}>
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReceipt(tx)}
                      >
                        {t("portal.payments.receipt")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Receipt Popover Modal */}
        <Dialog
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          title={`Official Receipt #${selectedReceipt?.receiptNumber}`}
          description="KHLIM Digital Sports Ecosystem Official Tax Invoice / Receipt"
        >
          {selectedReceipt && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.9375rem" }}>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Issued To:</span>
                  <strong>Richie Lim</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Payment Date:</span>
                  <strong>{selectedReceipt.paidAt}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Method:</span>
                  <strong>{selectedReceipt.paymentMethod}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Status:</span>
                  <Badge variant="success" size="sm">PAID (Reconciled)</Badge>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.125rem", fontWeight: 700 }}>Total Paid:</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#065F46" }}>
                  {formatCurrency(selectedReceipt.amount)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <Button variant="outline" size="md" onClick={() => setSelectedReceipt(null)}>
                  Close
                </Button>
                <Button variant="primary" size="md" onClick={() => window.print()}>
                  🖨️ Print Receipt
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </PortalShell>
  );
}
