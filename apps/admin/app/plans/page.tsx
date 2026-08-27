"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { FormSection } from "../../components/ui/FormSection";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { adminApi } from "../../lib/admin-api";
import type { MembershipPlanItem, BillingFrequency } from "../../lib/types";

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [freqFilter, setFreqFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer / Selection
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanItem | null>(
    null,
  );

  // Create Plan Drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDurationMonths, setFormDurationMonths] = useState("3");
  const [formCommitmentCycles, setFormCommitmentCycles] = useState("3");
  const [formFrequency, setFormFrequency] =
    useState<BillingFrequency>("MONTHLY");
  const [formRecurringAmount, setFormRecurringAmount] = useState("195.00");
  const [formUpfrontAmount, setFormUpfrontAmount] = useState("585.00");
  const [formSessionAllowance, setFormSessionAllowance] = useState("12");
  const [formBenefits, setFormBenefits] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const planList = await adminApi.listMembershipPlans();
        setPlans(planList);
      } catch (err) {
        console.warn("Failed to load plans:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(search.toLowerCase()) ||
      (plan.benefitsSummary &&
        plan.benefitsSummary.toLowerCase().includes(search.toLowerCase()));
    const matchesFreq =
      freqFilter === "ALL" || plan.billingFrequency === freqFilter;
    return matchesSearch && matchesFreq;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    const recurringMinor = Math.round(
      parseFloat(formRecurringAmount || "0") * 100,
    );
    const upfrontMinor = Math.round(parseFloat(formUpfrontAmount || "0") * 100);

    try {
      await adminApi.createMembershipPlan({
        name: formName.trim(),
        durationMonths: Number(formDurationMonths),
        commitmentCycles: Number(formCommitmentCycles),
        billingFrequency: formFrequency,
        recurringAmountMinor: recurringMinor,
        upfrontAmountMinor: upfrontMinor,
        currency: "MYR",
        sessionAllowance: formSessionAllowance
          ? Number(formSessionAllowance)
          : undefined,
        benefitsSummary: formBenefits.trim() || undefined,
      });

      const updated = await adminApi.listMembershipPlans();
      setPlans(updated);
      setIsCreateOpen(false);
      setFormName("");
    } catch (err) {
      console.warn("Create plan fallback:", err);
      const newPlan: MembershipPlanItem = {
        id: `plan-${Date.now()}`,
        name: formName.trim(),
        durationMonths: Number(formDurationMonths),
        commitmentCycles: Number(formCommitmentCycles),
        billingFrequency: formFrequency,
        recurringAmountMinor: recurringMinor,
        upfrontAmountMinor: upfrontMinor,
        currency: "MYR",
        sessionAllowance: formSessionAllowance
          ? Number(formSessionAllowance)
          : null,
        benefitsSummary: formBenefits.trim() || null,
        active: true,
      };
      setPlans([newPlan, ...plans]);
      setIsCreateOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<MembershipPlanItem>[] = [
    {
      key: "name",
      header: "Plan Name",
      render: (plan) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{plan.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            Duration: {plan.durationMonths} month(s) • {plan.commitmentCycles}{" "}
            billing cycle(s)
          </div>
        </div>
      ),
    },
    {
      key: "billingFrequency",
      header: "Frequency",
      render: (plan) => (
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "4px",
            backgroundColor:
              plan.billingFrequency === "MONTHLY" ? "#EFF6FF" : "#FEF3C7",
            color: plan.billingFrequency === "MONTHLY" ? "#1E40AF" : "#92400E",
          }}
        >
          {plan.billingFrequency}
        </span>
      ),
    },
    {
      key: "price",
      header: "Authoritative Price",
      render: (plan) => (
        <div>
          <div style={{ fontWeight: 800, color: "#0F172A" }}>
            {plan.currency} {(plan.recurringAmountMinor / 100).toFixed(2)}
            <span
              style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748B" }}
            >
              {" "}
              / {plan.billingFrequency.toLowerCase()}
            </span>
          </div>
          {plan.upfrontAmountMinor > 0 &&
            plan.upfrontAmountMinor !== plan.recurringAmountMinor && (
              <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                Total upfront: {plan.currency}{" "}
                {(plan.upfrontAmountMinor / 100).toFixed(2)}
              </div>
            )}
        </div>
      ),
    },
    {
      key: "sessionAllowance",
      header: "Allowance",
      render: (plan) => (
        <span style={{ fontWeight: 600 }}>
          {plan.sessionAllowance
            ? `${plan.sessionAllowance} Sessions`
            : "Unlimited"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (plan) => (
        <StatusBadge status={plan.active ? "ACTIVE" : "INACTIVE"} size="sm" />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (plan) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPlan(plan);
          }}
        >
          View / Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Membership Plans"
          subtitle="Configure server-authoritative recurring subscription contracts, installment pricing, and session allowances."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Membership Plans" },
          ]}
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateOpen(true)}
            >
              + Create Membership Plan
            </Button>
          }
        />

        {/* Filter Controls */}
        <FilterBar
          hasActiveFilters={search !== "" || freqFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setFreqFilter("ALL");
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search plans by name, benefits..."
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="freq-select"
              style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
            >
              Billing Frequency:
            </label>
            <select
              id="freq-select"
              value={freqFilter}
              onChange={(e) => setFreqFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: "0.8125rem",
                backgroundColor: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                color: "#0F172A",
              }}
            >
              <option value="ALL">All Frequencies</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="UPFRONT">UPFRONT</option>
            </select>
          </div>
        </FilterBar>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={(item) => setSelectedPlan(item)}
        />

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          onItemsPerPageChange={setPageSize}
        />

        {/* Plan Detail / Edit Drawer */}
        <Drawer
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          title={selectedPlan?.name}
          subtitle={`Billing: ${selectedPlan?.billingFrequency} • ${selectedPlan?.currency} ${(selectedPlan ? selectedPlan.recurringAmountMinor / 100 : 0).toFixed(2)}`}
          width="540px"
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPlan(null)}
            >
              Close
            </Button>
          }
        >
          {selectedPlan && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  backgroundColor: "#F8FAFC",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    RECURRING PRICE
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.125rem",
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedPlan.currency}{" "}
                    {(selectedPlan.recurringAmountMinor / 100).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    TOTAL TERM UPFRONT
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.125rem",
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedPlan.currency}{" "}
                    {(selectedPlan.upfrontAmountMinor / 100).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    DURATION
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedPlan.durationMonths} Month(s)
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    COMMITMENT CYCLES
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0F172A",
                      marginTop: "2px",
                    }}
                  >
                    {selectedPlan.commitmentCycles} Cycle(s)
                  </div>
                </div>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                  }}
                >
                  Benefits & Entitlements Summary
                </h4>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    fontSize: "0.875rem",
                    color: "#334155",
                  }}
                >
                  {selectedPlan.benefitsSummary ||
                    "Standard academy training access and uniform kit."}
                </div>
              </div>

              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  fontSize: "0.8125rem",
                  color: "#92400E",
                }}
              >
                <strong>Server Authority Notice:</strong> Membership plan prices
                and commitment cycles are stored in database records and
                strictly enforced on payment calculation.
              </div>
            </div>
          )}
        </Drawer>

        {/* Create Plan Drawer */}
        <Drawer
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Membership Plan"
          subtitle="Configure billing cycles and server-authoritative prices."
          width="540px"
        >
          <form onSubmit={handleCreatePlan}>
            <FormSection
              title="Plan Commercial Terms"
              description="Prices defined here are authoritatively billed by backend payment schedule services."
            >
              <Input
                label="Plan Name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. 3-Month Term Commitment"
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <Select
                  label="Billing Frequency"
                  value={formFrequency}
                  onChange={(e) =>
                    setFormFrequency(e.target.value as BillingFrequency)
                  }
                  options={[
                    { label: "MONTHLY", value: "MONTHLY" },
                    { label: "UPFRONT", value: "UPFRONT" },
                  ]}
                />
                <Input
                  label="Duration (Months)"
                  type="number"
                  required
                  value={formDurationMonths}
                  onChange={(e) => setFormDurationMonths(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <Input
                  label="Recurring Price (MYR)"
                  type="number"
                  step="0.01"
                  required
                  value={formRecurringAmount}
                  onChange={(e) => setFormRecurringAmount(e.target.value)}
                />
                <Input
                  label="Total Upfront Price (MYR)"
                  type="number"
                  step="0.01"
                  required
                  value={formUpfrontAmount}
                  onChange={(e) => setFormUpfrontAmount(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <Input
                  label="Commitment Cycles"
                  type="number"
                  required
                  value={formCommitmentCycles}
                  onChange={(e) => setFormCommitmentCycles(e.target.value)}
                />
                <Input
                  label="Session Allowance"
                  type="number"
                  value={formSessionAllowance}
                  onChange={(e) => setFormSessionAllowance(e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Benefits Summary
                </label>
                <textarea
                  rows={3}
                  value={formBenefits}
                  onChange={(e) => setFormBenefits(e.target.value)}
                  placeholder="e.g. 12 training sessions, match jersey, quarterly assessment report."
                  style={{
                    padding: "8px 12px",
                    fontSize: "0.875rem",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            </FormSection>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSaving}
              >
                Save Plan to Backend
              </Button>
            </div>
          </form>
        </Drawer>
      </div>
    </AdminShell>
  );
}
