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
  const { t, formatCurrency, formatDate } = useI18n();
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
        if (!cancelled) setError(t("enrol.error.loadOfferings"));
      })
      .finally(() => {
        if (!cancelled) setOfferingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
          setError(t("enrol.error.childRequired"));
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
              : t("enrol.error.createAthlete"),
          );
          return;
        }
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!selectedOffering) {
        setError(t("enrol.error.selectOffering"));
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!selectedPlan || chargeMinor === null) {
        setError(t("enrol.error.selectPlan"));
        return;
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      if (!termsAccepted || (requiresRecurringConsent && !recurringConsent)) {
        setError(t("enrol.error.acceptTerms"));
        return;
      }
      setCurrentStep(5);
      return;
    }

    if (!selectedOffering || !selectedPlan) return;
    const athleteId = selectedAthlete?.id ?? selectedChildId;
    if (!athleteId || athleteId === "new") {
      setError(t("enrol.error.selectAthlete"));
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
          : t("enrol.error.createPending"),
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
            {t("enrol.header.eyebrow")}
          </Badge>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, marginBottom: 8 }}>
            {t("enrol.header.title")}
          </h1>
          <p style={{ color: "#71717a" }}>{t("enrol.header.subtitle")}</p>
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
                  <Alert variant="info" title={t("enrol.signIn.title")}>
                    {t("enrol.signIn.body")}
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
                          <small>
                            {t("enrol.dateOfBirthLabel")}:{" "}
                            {formatDate(athlete.dateOfBirth)}
                          </small>
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
                  <p>{t("enrol.loadingOfferings")}</p>
                ) : offerings.length === 0 ? (
                  <Alert variant="warning">{t("enrol.noOfferings")}</Alert>
                ) : (
                  <RadioGroup
                    name="offering"
                    value={selectedOfferingId}
                    onChange={setSelectedOfferingId}
                    options={offerings.map((offering) => ({
                      value: offering.id,
                      title: `${offering.name} — ${offering.programme.name}`,
                      description: `${offering.venue?.name ?? t("enrol.venueToBeConfirmed")}${offering.startsOn ? ` • ${t("enrol.starts", { date: formatDate(offering.startsOn) })}` : ""}`,
                      badge: (
                        <Badge variant="neutral" size="sm">
                          {t("enrol.capacity", { count: offering.capacity })}
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
                  <Alert variant="warning">{t("enrol.noActivePlans")}</Alert>
                ) : (
                  <RadioGroup
                    name="plan"
                    value={selectedPlanId}
                    onChange={setSelectedPlanId}
                    options={eligiblePlans.map((plan) => {
                      const amount = getPlanChargeMinor(plan);
                      const amountLabel =
                        amount === null
                          ? t("enrol.pricingUnavailable")
                          : formatCurrency(amount / 100, plan.currency);
                      const billingLabel =
                        plan.billingFrequency === "UPFRONT"
                          ? t("enrol.upfrontPayment")
                          : t("enrol.monthlyInstallments", {
                              count:
                                plan.commitmentCycles ??
                                plan.durationMonths ??
                                1,
                            });
                      return {
                        value: plan.id,
                        title: plan.name,
                        description: `${amountLabel} • ${billingLabel}`,
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
                    {t("enrol.review.subtitle")}
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
                    {t("enrol.review.player")}:{" "}
                    <strong>
                      {selectedAthlete?.displayName ?? newChildName}
                    </strong>
                  </div>
                  <div>
                    {t("enrol.review.offering")}:{" "}
                    <strong>{selectedOffering?.name}</strong>
                  </div>
                  <div>
                    {t("enrol.review.plan")}:{" "}
                    <strong>{selectedPlan?.name}</strong>
                  </div>
                  <div>
                    {t("enrol.review.amount")}:{" "}
                    <strong>
                      {selectedPlan && chargeMinor !== null
                        ? formatCurrency(
                            chargeMinor / 100,
                            selectedPlan.currency,
                          )
                        : t("enrol.review.unavailable")}
                    </strong>
                  </div>
                  <div>
                    {t("enrol.review.billing")}:{" "}
                    <strong>
                      {selectedPlan?.billingFrequency === "UPFRONT"
                        ? t("enrol.plan.upfront")
                        : t("enrol.plan.monthly")}
                    </strong>
                  </div>
                </div>
                {requiresRecurringConsent ? (
                  <Checkbox
                    checked={recurringConsent}
                    onChange={(event) =>
                      setRecurringConsent(event.target.checked)
                    }
                    label={t("enrol.review.recurringAuthorization")}
                  />
                ) : null}
                <div style={{ marginTop: 14 }}>
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    label={
                      <span>
                        {t("enrol.terms.acceptPrefix")}{" "}
                        <Link href="/terms" target="_blank">
                          {t("enrol.terms.membershipLink")}
                        </Link>{" "}
                        {t("enrol.terms.and")}{" "}
                        <Link href="/privacy" target="_blank">
                          {t("enrol.terms.privacyLink")}
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
                    {t("enrol.payment.description")}
                  </CardDescription>
                </CardHeader>
                <Alert variant="info" title={t("enrol.payment.handoffTitle")}>
                  {t("enrol.payment.handoffBody")}
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
                  ? t("enrol.payment.createAndContinue")
                  : t("common.next")}
              </Button>
            </div>
          </Card>

          <aside className="enrolment-summary">
            <Card>
              <h3 style={{ marginTop: 0 }}>{t("enrol.summary.title")}</h3>
              <p>
                {t("enrol.review.player")}:{" "}
                <strong>
                  {(selectedAthlete?.displayName ?? newChildName) ||
                    t("enrol.summary.notSelected")}
                </strong>
              </p>
              <p>
                {t("enrol.review.offering")}:{" "}
                <strong>
                  {selectedOffering?.name ?? t("enrol.summary.notSelected")}
                </strong>
              </p>
              <p>
                {t("enrol.review.plan")}:{" "}
                <strong>
                  {selectedPlan?.name ?? t("enrol.summary.notSelected")}
                </strong>
              </p>
              <p>
                {t("enrol.review.amount")}:{" "}
                <strong>
                  {selectedPlan && chargeMinor !== null
                    ? formatCurrency(chargeMinor / 100, selectedPlan.currency)
                    : "—"}
                </strong>
              </p>
              <small style={{ color: "#71717a" }}>
                {t("enrol.summary.apiSource")}
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
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          {t("enrol.loading")}
        </div>
      }
    >
      <EnrolmentWizardContent />
    </Suspense>
  );
}
