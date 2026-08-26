"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { useAuth } from "../../lib/auth-context";
import { useFamily } from "../../lib/family-context";
import { PublicHeader } from "../../components/layout/public-header";
import { PublicFooter } from "../../components/layout/public-footer";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { RadioGroup } from "../../components/ui/radio-group";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import { StepIndicator } from "../../components/ui/step-indicator";
import { apiService } from "../../lib/api-service";
import type { PublicOfferingItem, MembershipPlanItem } from "../../lib/types";

const CURRENT_TERMS_VERSION = "membership-mvp-v1";

function EnrolmentWizardContent() {
  const { t, formatCurrency } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { athletes, activeChild, addChild } = useFamily();

  const preOfferingId = searchParams.get("offeringId");
  const prePlanId = searchParams.get("planId");

  const [offerings, setOfferings] = useState<PublicOfferingItem[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState<boolean>(true);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedChildId, setSelectedChildId] = useState<string>("new");

  // New athlete form
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("2016-05-10");
  const [newChildGender, setNewChildGender] = useState("Male");

  // Selections
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(preOfferingId || "");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(prePlanId || "");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [recurringConsent, setRecurringConsent] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadOfferings() {
      try {
        const data = await apiService.getPublicOfferings();
        setOfferings(data);
        if (data.length > 0 && !selectedOfferingId) {
          setSelectedOfferingId(data[0]!.id);
        }
      } catch (err) {
        setError("Unable to load live academy offerings from server.");
      } finally {
        setOfferingsLoading(false);
      }
    }
    loadOfferings();
  }, [selectedOfferingId]);

  useEffect(() => {
    if (athletes.length > 0 && selectedChildId === "new") {
      setSelectedChildId(activeChild?.id || athletes[0]!.id);
    }
  }, [athletes, activeChild, selectedChildId]);

  const selectedOffering =
    offerings.find((o) => o.id === selectedOfferingId) || offerings[0];
  const eligiblePlans = selectedOffering?.planEligibilities?.map((pe) => pe.plan) || [];
  const selectedPlan: MembershipPlanItem | undefined =
    eligiblePlans.find((p) => p.id === selectedPlanId) || eligiblePlans[0];

  useEffect(() => {
    if (eligiblePlans.length > 0 && (!selectedPlanId || !eligiblePlans.some((p) => p.id === selectedPlanId))) {
      setSelectedPlanId(eligiblePlans[0]!.id);
    }
  }, [eligiblePlans, selectedPlanId]);

  const selectedAthlete = athletes.find((a) => a.id === selectedChildId);

  const steps = [
    { id: 1, label: t("enrol.steps.player") },
    { id: 2, label: t("enrol.steps.programme") },
    { id: 3, label: t("enrol.steps.plan") },
    { id: 4, label: t("enrol.steps.terms") },
    { id: 5, label: t("enrol.steps.payment") },
  ];

  const handleNext = async () => {
    setError("");

    if (currentStep === 1) {
      if (!isAuthenticated) {
        // Direct unauthenticated users to log in or register before managing athlete contracts
        router.push(`/auth/login?redirect=${encodeURIComponent("/enrol")}`);
        return;
      }

      if (selectedChildId === "new") {
        if (!newChildName.trim() || !newChildDob) {
          setError("Please enter the child's full name and date of birth.");
          return;
        }
        try {
          const created = await addChild({
            displayName: newChildName.trim(),
            dateOfBirth: newChildDob,
            gender: newChildGender,
          });
          setSelectedChildId(created.id);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to create athlete";
          setError(message);
          return;
        }
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!selectedOffering) {
        setError("Please select a training offering.");
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!selectedPlan) {
        setError("Please select an eligible membership plan.");
        return;
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      if (!termsAccepted || !recurringConsent) {
        setError("You must agree to the Academy Terms and recurring billing consent to continue.");
        return;
      }
      setCurrentStep(5);
      return;
    }

    if (currentStep === 5) {
      if (!selectedAthlete?.id && selectedChildId === "new") {
        setError("Athlete identification missing. Please return to step 1.");
        return;
      }

      const athleteId = selectedAthlete?.id || selectedChildId;
      setIsProcessing(true);

      try {
        // 1. Create server-authoritative pending membership
        const membership = await apiService.createPendingMembership(athleteId, {
          programmeOfferingId: selectedOffering.id,
          membershipPlanId: selectedPlan.id,
          termsAcceptedVersion: CURRENT_TERMS_VERSION,
        });

        // 2. Request provider checkout session
        try {
          const checkout = await apiService.prepareCheckout(athleteId, membership.id, {
            acceptTerms: true,
            successUrl: `${window.location.origin}/enrol/confirmation?athleteId=${athleteId}&membershipId=${membership.id}`,
            cancelUrl: window.location.href,
          });

          if (checkout?.checkoutUrl) {
            window.location.href = checkout.checkoutUrl;
            return;
          }
        } catch (checkoutErr: unknown) {
          // If payment gateway is not yet wired in backend environment, route to confirmation with pending state
          console.warn("Payment gateway handoff note:", checkoutErr);
        }

        router.push(
          `/enrol/confirmation?athleteId=${athleteId}&membershipId=${membership.id}`,
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Enrolment creation failed on server";
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setError("");
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Badge variant="brand" size="md">
            Academy Enrolment
          </Badge>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: "#18181B", margin: "12px 0 6px" }}>
            Join KHLIM Basketball Academy
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#71717A" }}>
            Server-authoritative membership contracts and provider-hosted checkout.
          </p>
        </div>

        <StepIndicator steps={steps} currentStep={currentStep} />

        {error && (
          <div style={{ marginBottom: "24px" }}>
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px", alignItems: "flex-start" }}>
          <Card style={{ padding: "32px", borderRadius: "16px" }}>
            {/* Step 1: Athlete */}
            {currentStep === 1 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.player.selectTitle")}</CardTitle>
                  <CardDescription>{t("enrol.player.selectSubtitle")}</CardDescription>
                </CardHeader>

                {!isAuthenticated ? (
                  <div style={{ marginTop: "16px" }}>
                    <Alert variant="info" title="Guardian Sign In Required">
                      Please sign in with your guardian account to bind the athlete membership to your family.
                    </Alert>
                    <div style={{ marginTop: "16px" }}>
                      <Link href="/auth/login?redirect=/enrol" style={{ textDecoration: "none" }}>
                        <Button variant="primary" size="md">
                          Sign In as Guardian →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    {athletes.map((ath) => (
                      <label
                        key={ath.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "16px",
                          borderRadius: "10px",
                          border: selectedChildId === ath.id ? "2px solid #F59E0B" : "1px solid #E4E4E7",
                          backgroundColor: selectedChildId === ath.id ? "#FFFDF5" : "#FFFFFF",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="childSelection"
                          checked={selectedChildId === ath.id}
                          onChange={() => setSelectedChildId(ath.id)}
                          style={{ accentColor: "#F59E0B", width: "18px", height: "18px" }}
                        />
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: "#FEF3C7",
                            color: "#92400E",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                          }}
                        >
                          {ath.displayName[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{ath.displayName}</div>
                          <div style={{ fontSize: "0.8125rem", color: "#71717A" }}>
                            Date of Birth: {ath.dateOfBirth}
                          </div>
                        </div>
                        <Badge variant="success" size="sm">
                          Linked Athlete
                        </Badge>
                      </label>
                    ))}

                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                        padding: "16px",
                        borderRadius: "10px",
                        border: selectedChildId === "new" ? "2px solid #F59E0B" : "1px solid #E4E4E7",
                        backgroundColor: selectedChildId === "new" ? "#FFFDF5" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="childSelection"
                        checked={selectedChildId === "new"}
                        onChange={() => setSelectedChildId("new")}
                        style={{ accentColor: "#F59E0B", width: "18px", height: "18px", marginTop: "4px" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#18181B" }}>
                          {t("enrol.player.addNew")}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "#71717A", marginBottom: "12px" }}>
                          Register a new child to your guardian account.
                        </div>

                        {selectedChildId === "new" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                            <Input
                              label={t("enrol.player.fullName")}
                              required
                              value={newChildName}
                              onChange={(e) => setNewChildName(e.target.value)}
                              placeholder="e.g. Lucas Lim"
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <Input
                                label={t("enrol.player.dob")}
                                type="date"
                                required
                                value={newChildDob}
                                onChange={(e) => setNewChildDob(e.target.value)}
                              />
                              <Select
                                label={t("enrol.player.gender")}
                                value={newChildGender}
                                onChange={(e) => setNewChildGender(e.target.value)}
                                options={[
                                  { label: "Male", value: "Male" },
                                  { label: "Female", value: "Female" },
                                ]}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Programme Offering */}
            {currentStep === 2 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.programme.selectTitle")}</CardTitle>
                  <CardDescription>{t("enrol.programme.selectSubtitle")}</CardDescription>
                </CardHeader>

                {offeringsLoading ? (
                  <div style={{ padding: "20px", textAlign: "center" }}>Loading offerings...</div>
                ) : offerings.length === 0 ? (
                  <Alert variant="warning" title="No Offerings Available">
                    There are currently no open programme offerings available.
                  </Alert>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
                    <RadioGroup
                      name="offeringSelection"
                      value={selectedOfferingId}
                      onChange={setSelectedOfferingId}
                      options={offerings.map((off) => ({
                        value: off.id,
                        title: `${off.name} (${off.programme?.name})`,
                        description: `📍 Venue: ${off.venue?.name || "KHLIM Training Centre"} | Starts: ${off.startsOn}`,
                        badge: (
                          <Badge variant="brand" size="sm">
                            Capacity: {off.capacity}
                          </Badge>
                        ),
                      }))}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Plan */}
            {currentStep === 3 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.plan.selectTitle")}</CardTitle>
                  <CardDescription>{t("enrol.plan.selectSubtitle")}</CardDescription>
                </CardHeader>

                {eligiblePlans.length === 0 ? (
                  <Alert variant="warning" title="No Plans Linked">
                    No active membership plans are eligible for this offering.
                  </Alert>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    <RadioGroup
                      name="planSelection"
                      value={selectedPlanId}
                      onChange={setSelectedPlanId}
                      options={eligiblePlans.map((plan) => {
                        const monthlyPrice = plan.recurringAmountMinor / 100;
                        return {
                          value: plan.id,
                          title: plan.name,
                          description: (
                            <div>
                              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B", margin: "4px 0" }}>
                                {formatCurrency(monthlyPrice)}
                                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#71717A" }}>
                                  {" "}
                                  / {plan.billingFrequency.toLowerCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.8125rem", color: "#52525B" }}>
                                {plan.commitmentCycles} billing cycle(s) • {plan.durationMonths} months duration
                              </div>
                            </div>
                          ),
                        };
                      })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Terms & Recurring Consent */}
            {currentStep === 4 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.terms.title")}</CardTitle>
                  <CardDescription>
                    Review your commercial commitment snapshot before provider payment authorization.
                  </CardDescription>
                </CardHeader>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "10px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      fontSize: "0.875rem",
                      color: "#334155",
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>
                      Server Authoritative Commercial Snapshot ({CURRENT_TERMS_VERSION})
                    </div>
                    <div>• Athlete: <strong>{selectedAthlete?.displayName || newChildName}</strong></div>
                    <div>• Offering: <strong>{selectedOffering?.name}</strong></div>
                    <div>• Plan: <strong>{selectedPlan?.name}</strong></div>
                    <div>• Frequency: <strong>{selectedPlan?.billingFrequency}</strong></div>
                    <div>
                      • Amount:{" "}
                      <strong>
                        {selectedPlan
                          ? formatCurrency(selectedPlan.recurringAmountMinor / 100)
                          : "MYR 0"}
                      </strong>
                    </div>
                    <div>• Cycles: <strong>{selectedPlan?.commitmentCycles} cycle(s)</strong></div>
                  </div>

                  <Checkbox
                    label={
                      <span>
                        I authorize the recurring payment of{" "}
                        <strong>
                          {selectedPlan
                            ? formatCurrency(selectedPlan.recurringAmountMinor / 100)
                            : "MYR 0"}
                        </strong>{" "}
                        on the agreed schedule for {selectedPlan?.commitmentCycles} installments.
                      </span>
                    }
                    checked={recurringConsent}
                    onChange={(e) => setRecurringConsent(e.target.checked)}
                  />

                  <Checkbox
                    label={
                      <span>
                        I accept the <Link href="/terms" target="_blank" style={{ color: "#F59E0B" }}>KHLIM Academy Terms ({CURRENT_TERMS_VERSION})</Link> and <Link href="/privacy" target="_blank" style={{ color: "#F59E0B" }}>Child Privacy Policy</Link>.
                      </span>
                    }
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Secure Payment Provider Handoff */}
            {currentStep === 5 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.steps.payment")}</CardTitle>
                  <CardDescription>
                    Secure payment provider checkout handoff.
                  </CardDescription>
                </CardHeader>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
                  <Alert variant="info" title="🔒 Provider-Hosted Checkout">
                    KHLIM uses external PCI-compliant payment gateways. Card details are entered exclusively on the payment provider's secure hosted interface.
                  </Alert>

                  <div
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      backgroundColor: "#FAFAFA",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>💳</div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#18181B", marginBottom: "4px" }}>
                      Ready for Payment Authorization
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#64748B", maxWidth: "400px", margin: "0 auto 16px" }}>
                      Clicking below will create your pending membership contract on the KHLIM backend and hand off to the payment gateway.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Button Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "32px",
                paddingTop: "20px",
                borderTop: "1px solid #F4F4F5",
              }}
            >
              {currentStep > 1 ? (
                <Button variant="outline" size="md" onClick={handleBack}>
                  ← {t("common.back")}
                </Button>
              ) : (
                <div />
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                isLoading={isProcessing}
              >
                {currentStep === 5 ? "Complete & Handoff to Payment →" : `${t("common.next")} →`}
              </Button>
            </div>
          </Card>

          {/* Sticky Order Summary Sidebar */}
          <div style={{ position: "sticky", top: "90px" }}>
            <Card style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4E4E7" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#18181B", margin: "0 0 16px" }}>
                Enrolment Quote
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Player</span>
                  <strong style={{ color: "#18181B" }}>
                    {selectedAthlete?.displayName || (newChildName || "New Player")}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Offering</span>
                  <strong style={{ color: "#18181B" }}>{selectedOffering?.name || "—"}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Plan</span>
                  <strong style={{ color: "#18181B" }}>{selectedPlan?.name || "—"}</strong>
                </div>

                <div style={{ borderTop: "1px solid #E4E4E7", margin: "8px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#18181B" }}>Installment Due:</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#18181B" }}>
                    {selectedPlan
                      ? formatCurrency(selectedPlan.recurringAmountMinor / 100)
                      : "—"}
                  </span>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#71717A" }}>
                  Calculated authoritatively by KHLIM backend
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function EnrolmentWizardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading wizard...</div>}>
      <EnrolmentWizardContent />
    </Suspense>
  );
}
