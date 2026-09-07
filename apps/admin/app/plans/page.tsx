"use client";

import React, { useEffect, useState } from "react";
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
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { updateMembershipPlanActive } from "../../lib/admin-academy-write-api";
import { adminApi } from "../../lib/admin-api";
import { ADMIN_DEMO_MODE } from "../../lib/demo-mode";
import type { BillingFrequency, MembershipPlanItem } from "../../lib/types";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function toMinorUnits(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [freqFilter, setFreqFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanItem | null>(
    null,
  );
  const [planStateChange, setPlanStateChange] = useState<{
    plan: MembershipPlanItem;
    active: boolean;
  } | null>(null);
  const [isChangingState, setIsChangingState] = useState(false);

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
  const [createError, setCreateError] = useState<string | null>(null);

  async function refreshPlans() {
    const list = await adminApi.listMembershipPlans();
    setPlans(list);
    setSelectedPlan((current) =>
      current ? list.find((item) => item.id === current.id) || null : null,
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        await refreshPlans();
      } catch (error) {
        setPageError(
          errorMessage(
            error,
            "Membership plans could not be loaded from the backend.",
          ),
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = plans.filter((plan) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      plan.name.toLowerCase().includes(query) ||
      plan.benefitsSummary?.toLowerCase().includes(query);
    const matchesFrequency =
      freqFilter === "ALL" || plan.billingFrequency === freqFilter;
    return matchesSearch && matchesFrequency;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleCreatePlan(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setStatusMessage(null);

    const durationMonths = Number(formDurationMonths);
    const commitmentCycles = Number(formCommitmentCycles);
    const recurringAmountMinor = toMinorUnits(formRecurringAmount);
    const upfrontAmountMinor = toMinorUnits(formUpfrontAmount);
    const sessionAllowance = formSessionAllowance
      ? Number(formSessionAllowance)
      : undefined;

    if (!formName.trim()) {
      setCreateError("Plan name is required.");
      return;
    }
    if (!Number.isInteger(durationMonths) || durationMonths < 1) {
      setCreateError("Duration must be a positive whole number of months.");
      return;
    }
    if (!Number.isInteger(commitmentCycles) || commitmentCycles < 1) {
      setCreateError("Commitment cycles must be a positive whole number.");
      return;
    }
    if (recurringAmountMinor === null || upfrontAmountMinor === null) {
      setCreateError("Pricing must use valid non-negative MYR amounts.");
      return;
    }
    if (
      sessionAllowance !== undefined &&
      (!Number.isInteger(sessionAllowance) || sessionAllowance < 1)
    ) {
      setCreateError("Session allowance must be a positive whole number.");
      return;
    }

    setIsSaving(true);
    try {
      await adminApi.createMembershipPlan({
        name: formName.trim(),
        durationMonths,
        commitmentCycles,
        billingFrequency: formFrequency,
        recurringAmountMinor,
        upfrontAmountMinor,
        currency: "MYR",
        sessionAllowance,
        benefitsSummary: formBenefits.trim() || undefined,
      });

      if (!ADMIN_DEMO_MODE) {
        await refreshPlans();
      }
      setIsCreateOpen(false);
      setFormName("");
      setStatusMessage(
        ADMIN_DEMO_MODE
          ? "Demo write simulated. Changes are not persisted."
          : "Membership plan persisted successfully and reloaded from the backend.",
      );
    } catch (error) {
      setCreateError(
        errorMessage(
          error,
          "Membership plan was not saved. No local fallback record was created.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePlanStateChange() {
    if (!planStateChange) return;
    const { plan, active } = planStateChange;
    setIsChangingState(true);
    setPageError(null);
    setStatusMessage(null);

    try {
      const outcome = await updateMembershipPlanActive(plan.id, active);
      if (outcome.demo) {
        setPlans((current) =>
          current.map((item) =>
            item.id === plan.id ? { ...item, active } : item,
          ),
        );
        setSelectedPlan((current) =>
          current?.id === plan.id ? { ...current, active } : current,
        );
        setStatusMessage(
          "Demo plan-state change simulated. Changes are not persisted.",
        );
      } else {
        await refreshPlans();
        setStatusMessage(
          `Membership plan persisted as ${active ? "ACTIVE" : "INACTIVE"}.`,
        );
      }
      setPlanStateChange(null);
    } catch (error) {
      setPageError(
        errorMessage(
          error,
          "Membership plan state was not changed. Backend state remains authoritative.",
        ),
      );
    } finally {
      setIsChangingState(false);
    }
  }

  const columns: Column<MembershipPlanItem>[] = [
    {
      key: "name",
      header: "Plan Name",
      render: (plan) => (
        <div>
          <div style={{ fontWeight: 700 }}>{plan.name}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
            {plan.durationMonths} month(s) • {plan.commitmentCycles} billing
            cycle(s)
          </div>
        </div>
      ),
    },
    {
      key: "billingFrequency",
      header: "Frequency",
      render: (plan) => plan.billingFrequency,
    },
    {
      key: "price",
      header: "Authoritative Price",
      render: (plan) => (
        <div>
          <strong>
            {plan.currency} {(plan.recurringAmountMinor / 100).toFixed(2)}
          </strong>
          {plan.upfrontAmountMinor !== plan.recurringAmountMinor && (
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
              Upfront: {plan.currency} {(plan.upfrontAmountMinor / 100).toFixed(2)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "sessionAllowance",
      header: "Allowance",
      render: (plan) =>
        plan.sessionAllowance ? `${plan.sessionAllowance} Sessions` : "Unlimited",
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
          onClick={(event) => {
            event.stopPropagation();
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
          subtitle="Configure backend-authoritative commitment, allowance, and pricing rules."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Membership Plans" },
          ]}
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
            >
              + Create Membership Plan
            </Button>
          }
        />

        {pageError && (
          <div role="alert" style={{ marginBottom: 16, color: "#991B1B" }}>
            {pageError}
          </div>
        )}
        {statusMessage && (
          <div role="status" style={{ marginBottom: 16, color: "#065F46" }}>
            {statusMessage}
          </div>
        )}

        <FilterBar
          hasActiveFilters={search !== "" || freqFilter !== "ALL"}
          onReset={() => {
            setSearch("");
            setFreqFilter("ALL");
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search membership plans..."
          />
          <Select
            aria-label="Filter by billing frequency"
            value={freqFilter}
            onChange={(event) => {
              setFreqFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { label: "All frequencies", value: "ALL" },
              { label: "MONTHLY", value: "MONTHLY" },
              { label: "UPFRONT", value: "UPFRONT" },
            ]}
          />
        </FilterBar>

        <DataTable
          columns={columns}
          data={paginated}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRowClick={setSelectedPlan}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          onItemsPerPageChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        {planStateChange && (
          <ConfirmDialog
            isOpen
            onClose={() => {
              if (!isChangingState) setPlanStateChange(null);
            }}
            onConfirm={handlePlanStateChange}
            title={
              planStateChange.active
                ? "Activate Membership Plan"
                : "Deactivate Membership Plan"
            }
            description={`This changes the persisted availability state for “${planStateChange.plan.name}”. Existing memberships remain separate records.`}
            confirmLabel={
              isChangingState
                ? "Saving..."
                : planStateChange.active
                  ? "Activate Plan"
                  : "Deactivate Plan"
            }
            variant={planStateChange.active ? "primary" : "warning"}
          />
        )}

        <Drawer
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          title={selectedPlan?.name}
          subtitle={
            selectedPlan
              ? `${selectedPlan.billingFrequency} • ${selectedPlan.currency}`
              : undefined
          }
          width="540px"
        >
          {selectedPlan && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <strong>Recurring amount:</strong> {selectedPlan.currency}{" "}
                {(selectedPlan.recurringAmountMinor / 100).toFixed(2)}
              </div>
              <div>
                <strong>Upfront amount:</strong> {selectedPlan.currency}{" "}
                {(selectedPlan.upfrontAmountMinor / 100).toFixed(2)}
              </div>
              <div>
                <strong>Benefits:</strong>{" "}
                {selectedPlan.benefitsSummary || "No benefits summary provided."}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPlanStateChange({
                    plan: selectedPlan,
                    active: !selectedPlan.active,
                  })
                }
              >
                {selectedPlan.active ? "Deactivate Plan" : "Activate Plan"}
              </Button>
            </div>
          )}
        </Drawer>

        <Drawer
          isOpen={isCreateOpen}
          onClose={() => {
            if (!isSaving) {
              setCreateError(null);
              setIsCreateOpen(false);
            }
          }}
          title="Create Membership Plan"
          subtitle="Persist pricing in minor currency units through the Academy backend."
          width="560px"
        >
          <form onSubmit={handleCreatePlan}>
            <FormSection
              title="Plan Configuration"
              description="Pricing remains server-authoritative and separate from payment state."
            >
              <Input
                label="Plan Name"
                required
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
              />
              <Input
                label="Duration (months)"
                type="number"
                min={1}
                required
                value={formDurationMonths}
                onChange={(event) => setFormDurationMonths(event.target.value)}
              />
              <Input
                label="Commitment Cycles"
                type="number"
                min={1}
                required
                value={formCommitmentCycles}
                onChange={(event) => setFormCommitmentCycles(event.target.value)}
              />
              <Select
                label="Billing Frequency"
                required
                value={formFrequency}
                onChange={(event) =>
                  setFormFrequency(event.target.value as BillingFrequency)
                }
                options={[
                  { label: "Monthly", value: "MONTHLY" },
                  { label: "Upfront", value: "UPFRONT" },
                ]}
              />
              <Input
                label="Recurring Amount (MYR)"
                type="number"
                min={0}
                step="0.01"
                value={formRecurringAmount}
                onChange={(event) => setFormRecurringAmount(event.target.value)}
              />
              <Input
                label="Upfront Amount (MYR)"
                type="number"
                min={0}
                step="0.01"
                value={formUpfrontAmount}
                onChange={(event) => setFormUpfrontAmount(event.target.value)}
              />
              <Input
                label="Session Allowance"
                type="number"
                min={1}
                value={formSessionAllowance}
                onChange={(event) => setFormSessionAllowance(event.target.value)}
              />
              <Input
                label="Benefits Summary"
                value={formBenefits}
                onChange={(event) => setFormBenefits(event.target.value)}
              />
            </FormSection>

            {createError && (
              <div role="alert" style={{ marginTop: 16, color: "#991B1B" }}>
                <strong>Membership plan not saved.</strong> {createError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Button
                variant="outline"
                size="md"
                type="button"
                disabled={isSaving}
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
