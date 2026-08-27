"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useFamily } from "../../lib/family-context";
import { useI18n } from "../../lib/i18n-context";
import { apiService } from "../../lib/api-service";
import {
  getPlanChargeMinor,
  type AthleteMembershipItem,
  type MembershipPlanItem,
  type PublicOfferingItem,
} from "../../lib/types";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { RadioGroup } from "../../components/ui/radio-group";
import { StepIndicator } from "../../components/ui/step-indicator";

function EnrolmentWizardContent() {
  const { t, formatCurrency } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { athletes, activeChild, addChild } = useFamily();
  const preAthleteId = searchParams.get("athleteId");
  const preOfferingId = searchParams.get("offeringId");
  const prePlanId = searchParams.get("planId");

  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChildId, setSelectedChildId] = useState(preAthleteId ?? "new");
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("");
  const [selectedOfferingId, setSelectedOfferingId] = useState(
    preOfferingId ?? "",
  );
  const [selectedPlanId, setSelectedPlanId] = useState(prePlanId ?? "");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [recurringConsent, setRecurringConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiService
      .getPublicOfferings()
      .then((data) => {
        if (cancelled) return;
        setOfferings(data);
        setSelectedOfferingId((current) => current || data[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Unable to load current academy offerings from the KHLIM API.",
          );
      })
      .finally(() => {
        if (!cancelled) setOfferingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      preAthleteId &&
      athletes.some((athlete) => athlete.id === preAthleteId)
    ) {
      setSelectedChildId(preAthleteId);
      return;
    }
    if (selectedChildId === "new" && athletes.length > 0) {
      setSelectedChildId(activeChild?.id ?? athletes[0]!.id);
    }
  }, [activeChild, athletes, preAthleteId, selectedChildId]);

  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === selectedOfferingId),
    [offerings, selectedOfferingId],
  );
  const eligiblePlans = useMemo(
    () => selectedOffering?.planEligibilities.map(({ plan }) => plan) ?? [],
    [selectedOffering],
  );

  useEffect(() => {
    if (eligiblePlans.length === 0) {
      setSelectedPlanId("");
      return;
    }
    if (!eligiblePlans.some((plan) => plan.id === selectedPlanId)) {
      const requested = eligiblePlans.find((plan) => plan.id === prePlanId);
      setSelectedPlanId(requested?.id ?? eligiblePlans[0]!.id);
    }
  }, [eligiblePlans, prePlanId, selectedPlanId]);

  const selectedPlan: MembershipPlanItem | undefined = eligiblePlans.find(
    (plan) => plan.id === selectedPlanId,
  );
  const selectedAthlete = athletes.find(
    (athlete) => athlete.id === selectedChildId,
  );
  const chargeMinor = selectedPlan ? getPlanChargeMinor(selectedPlan) : null;
  const requiresRecurringConsent = selectedPlan?.billingFrequency === "MONTHLY";

  const steps = [
    { id: 1, label: t("enrol.steps.player") },
    { id: 2, label: t("enrol.steps.programme") },
    { id: 3, label: t("enrol.steps.plan") },
    { id: 4, label: t("enrol.steps.terms") },
    { id: 5, label: t("enrol.steps.payment") },
  ];

  const ensurePendingMembership = async (
    athleteId: string,
    offering: PublicOfferingItem,
    plan: MembershipPlanItem,
  ): Promise<AthleteMembershipItem> => {
    try {
      return await apiService.createPendingMembership(athleteId, {
        offeringId: offering.id,
        planId: plan.id,
      });
    } catch (caught) {
      const current = await apiService.listAthleteMemberships(athleteId);
      const existing = current.find(
        (membership) =>
          membership.programmeOfferingId === offering.id &&
          membership.membershipPlanId === plan.id &&
          membership.status === "PENDING",
      );
      if (existing) return existing;
      throw caught;
    }
  };

  const handleNext = async () => {
    setError("");

    if (currentStep === 1) {
      if (!isAuthenticated) {
        router.push(`/auth/login?redirect=${encodeURIComponent("/enrol")}`);
        return;
      }
      if (selectedChildId === "new") {
        if (!newChildName.trim() || !newChildDob) {
          setError("Enter the child's name and date of birth.");
          return;
        }
        try {
          const created = await addChild({
            displayName: newChildName.trim(),
            dateOfBirth: newChildDob,
          });
          setSelectedChildId(created.id);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to create the athlete profile.",
          );
          return;
        }
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!selectedOffering) {
        setError("Select an available programme offering.");
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!selectedPlan || chargeMinor === null) {
        setError("Select a valid membership plan with configured pricing.");
        return;
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      if (!termsAccepted || (requiresRecurringConsent && !recurringConsent)) {
        setError(
          "Accept the membership terms and any required recurring-billing authorization to continue.",
        );
        return;
      }
      setCurrentStep(5);
      return;
    }

    if (!selectedOffering || !selectedPlan) return;
    const athleteId = selectedAthlete?.id ?? selectedChildId;
    if (!athleteId || athleteId === "new") {
      setError("Select or create an athlete before checkout.");
      return;
    }

    setIsProcessing(true);
    try {
      const membership = await ensurePendingMembership(
        athleteId,
        selectedOffering,
        selectedPlan,
      );

      try {
        const checkout = await apiService.prepareCheckout(
          athleteId,
          membership.id,
          { acceptTerms: true },
        );
        if (checkout.checkoutUrl) {
          window.location.assign(checkout.checkoutUrl);
          return;
        }
      } catch {
        // The pending membership remains authoritative even when a payment provider
        // is intentionally unavailable in this environment.
      }

      router.push(
        `/enrol/confirmation?athleteId=${encodeURIComponent(athleteId)}&membershipId=${encodeURIComponent(membership.id)}`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create the pending membership.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Badge variant="brand" size="md">
            Academy Enrolment
          </Badge>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, marginBottom: 8 }}>
            Join KHLIM Basketball Academy
          </h1>
          <p style={{ color: "#71717a" }}>
            Programme availability and pricing are loaded from the KHLIM
            backend.
          </p>
        </div>
        <StepIndicator steps={steps} currentStep={currentStep} />
        {error ? (
          <div style={{ marginBottom: 20 }}>
            <Alert variant="danger">{error}</Alert>
          </div>
        ) : null}

        <div className="enrolment-layout">
          <Card style={{ padding: 32, borderRadius: 16 }}>
            {currentStep === 1 ? (
              <section>
                <CardHeader>
                  <CardTitle>{t("enrol.player.selectTitle")}</CardTitle>
                  <CardDescription>
                    {t("enrol.player.selectSubtitle")}
                  </CardDescription>
                </CardHeader>
                {!isAuthenticated ? (
                  <Alert variant="info" title="Guardian sign-in required">
                    Sign in before creating or selecting a managed athlete.
                  </Alert>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginTop: 16,
                    }}
                  >
                    {athletes.map((athlete) => (
                      <label
                        key={athlete.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: 14,
                          border:
                            selectedChildId === athlete.id
                              ? "2px solid #f59e0b"
                              : "1px solid #e4e4e7",
                          borderRadius: 10,
                        }}
                      >
                        <input
                          type="radio"
                          name="athlete"
                          checked={selectedChildId === athlete.id}
                          onChange={() => setSelectedChildId(athlete.id)}
                        />
                        <span>
                          <strong>{athlete.displayName}</strong>
                          <br />
                          <small>Date of birth: {athlete.dateOfBirth}</small>
                        </span>
                      </label>
                    ))}
                    <label
                      style={{
                        display: "block",
                        padding: 14,
                        border:
                          selectedChildId === "new"
                            ? "2px solid #f59e0b"
                            : "1px solid #e4e4e7",
                        borderRadius: 10,
                      }}
                    >
                      <div>
                        <input
                          type="radio"
                          name="athlete"
                          checked={selectedChildId === "new"}
                          onChange={() => setSelectedChildId("new")}
                        />{" "}
                        <strong>{t("enrol.player.addNew")}</strong>
                      </div>
                      {selectedChildId === "new" ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            marginTop: 12,
                          }}
                        >
                          <Input
                            label={t("enrol.player.fullName")}
                            required
                            value={newChildName}
                            onChange={(event) =>
                              setNewChildName(event.target.value)
                            }
                          />
                          <Input
                            label={t("enrol.player.dob")}
                            type="date"
                            required
                            value={newChildDob}
                            onChange={(event) =>
                              setNewChildDob(event.target.value)
                            }
                          />
                        </div>
                      ) : null}
                    </label>
                  </div>
                )}
              </section>
            ) : null}

            {currentStep === 2 ? (
              <section>
                <CardHeader>
                  <CardTitle>{t("enrol.programme.selectTitle")}</CardTitle>
                  <CardDescription>
                    {t("enrol.programme.selectSubtitle")}
                  </CardDescription>
                </CardHeader>
                {offeringsLoading ? (
                  <p>Loading offerings…</p>
                ) : offerings.length === 0 ? (
                  <Alert variant="warning">
                    No open programme offerings are currently available.
                  </Alert>
                ) : (
                  <RadioGroup
                    name="offering"
                    value={selectedOfferingId}
                    onChange={setSelectedOfferingId}
                    options={offerings.map((offering) => ({
                      value: offering.id,
                      title: `${offering.name} — ${offering.programme.name}`,
                      description: `${offering.venue?.name ?? "Venue to be confirmed"}${offering.startsOn ? ` • Starts ${offering.startsOn}` : ""}`,
                      badge: (
                        <Badge variant="neutral" size="sm">
                          Capacity {offering.capacity}
                        </Badge>
                      ),
                    }))}
                  />
                )}
              </section>
            ) : null}

            {currentStep === 3 ? (
              <section>
                <CardHeader>
                  <CardTitle>{t("enrol.plan.selectTitle")}</CardTitle>
                  <CardDescription>
                    {t("enrol.plan.selectSubtitle")}
                  </CardDescription>
                </CardHeader>
                {eligiblePlans.length === 0 ? (
                  <Alert variant="warning">
                    No active plans are linked to this offering.
                  </Alert>
                ) : (
                  <RadioGroup
                    name="plan"
                    value={selectedPlanId}
                    onChange={setSelectedPlanId}
                    options={eligiblePlans.map((plan) => {
                      const amount = getPlanChargeMinor(plan);
                      const amountLabel =
                        amount === null
                          ? "Pricing unavailable"
                          : formatCurrency(amount / 100, plan.currency);
                      return {
                        value: plan.id,
                        title: plan.name,
                        description: `${amountLabel} • ${plan.billingFrequency === "UPFRONT" ? "one-time upfront payment" : `${plan.commitmentCycles ?? plan.durationMonths ?? 1} monthly installment(s)`}`,
                      };
                    })}
                  />
                )}
              </section>
            ) : null}

            {currentStep === 4 ? (
              <section>
                <CardHeader>
                  <CardTitle>{t("enrol.terms.title")}</CardTitle>
                  <CardDescription>
                    Review the server-provided plan before billing
                    authorization.
                  </CardDescription>
                </CardHeader>
                <div
                  style={{
                    padding: 16,
                    background: "#f8fafc",
                    borderRadius: 10,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    Player:{" "}
                    <strong>
                      {selectedAthlete?.displayName ?? newChildName}
                    </strong>
                  </div>
                  <div>
                    Offering: <strong>{selectedOffering?.name}</strong>
                  </div>
                  <div>
                    Plan: <strong>{selectedPlan?.name}</strong>
                  </div>
                  <div>
                    Amount:{" "}
                    <strong>
                      {selectedPlan && chargeMinor !== null
                        ? formatCurrency(
                            chargeMinor / 100,
                            selectedPlan.currency,
                          )
                        : "Unavailable"}
                    </strong>
                  </div>
                  <div>
                    Billing: <strong>{selectedPlan?.billingFrequency}</strong>
                  </div>
                </div>
                {requiresRecurringConsent ? (
                  <Checkbox
                    checked={recurringConsent}
                    onChange={(event) =>
                      setRecurringConsent(event.target.checked)
                    }
                    label="I authorize the recurring installment schedule shown above."
                  />
                ) : null}
                <div style={{ marginTop: 14 }}>
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    label={
                      <span>
                        I accept the{" "}
                        <Link href="/terms" target="_blank">
                          draft KHLIM membership terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" target="_blank">
                          privacy notice
                        </Link>
                        .
                      </span>
                    }
                  />
                </div>
              </section>
            ) : null}

            {currentStep === 5 ? (
              <section>
                <CardHeader>
                  <CardTitle>{t("enrol.steps.payment")}</CardTitle>
                  <CardDescription>
                    Checkout is hosted by the configured payment provider.
                  </CardDescription>
                </CardHeader>
                <Alert variant="info" title="Secure provider handoff">
                  KHLIM does not render or store card numbers or CVVs. If no
                  provider is configured, your membership remains PENDING and no
                  payment is claimed.
                </Alert>
              </section>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 28,
                borderTop: "1px solid #e4e4e7",
                paddingTop: 20,
              }}
            >
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setError("");
                    setCurrentStep((step) => step - 1);
                  }}
                >
                  ← {t("common.back")}
                </Button>
              ) : (
                <span />
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                isLoading={isProcessing}
              >
                {currentStep === 5
                  ? "Create membership & continue to payment"
                  : t("common.next")}
              </Button>
            </div>
          </Card>

          <aside className="enrolment-summary">
            <Card>
              <h3 style={{ marginTop: 0 }}>Enrolment summary</h3>
              <p>
                Player:{" "}
                <strong>
                  {(selectedAthlete?.displayName ?? newChildName) ||
                    "Not selected"}
                </strong>
              </p>
              <p>
                Offering:{" "}
                <strong>{selectedOffering?.name ?? "Not selected"}</strong>
              </p>
              <p>
                Plan: <strong>{selectedPlan?.name ?? "Not selected"}</strong>
              </p>
              <p>
                Amount:{" "}
                <strong>
                  {selectedPlan && chargeMinor !== null
                    ? formatCurrency(chargeMinor / 100, selectedPlan.currency)
                    : "—"}
                </strong>
              </p>
              <small style={{ color: "#71717a" }}>
                Price and eligibility originate from the KHLIM API.
              </small>
            </Card>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function EnrolmentWizardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          Loading enrolment…
        </div>
      }
    >
      <EnrolmentWizardContent />
    </Suspense>
  );
}
