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
import {
  INITIAL_OFFERINGS,
  INITIAL_MEMBERSHIP_PLANS,
  apiService,
} from "../../lib/api-service";

function EnrolmentWizardContent() {
  const { t, formatCurrency } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { athletes, activeChild, addChild } = useFamily();

  // URL pre-selection
  const preOfferingId = searchParams.get("offeringId");
  const prePlanId = searchParams.get("planId");

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedChildId, setSelectedChildId] = useState<string>(activeChild?.id ?? athletes[0]?.id ?? "new");
  
  // New child form fields
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("2016-05-10");
  const [newChildGender, setNewChildGender] = useState("Male");

  // Step selections
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(preOfferingId ?? INITIAL_OFFERINGS[0]!.id);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(prePlanId ?? INITIAL_MEMBERSHIP_PLANS[1]!.id);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [recurringConsent, setRecurringConsent] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (athletes.length > 0 && selectedChildId === "new") {
      setSelectedChildId(athletes[0]!.id);
    }
  }, [athletes, selectedChildId]);

  const selectedOffering = INITIAL_OFFERINGS.find((o) => o.id === selectedOfferingId) ?? INITIAL_OFFERINGS[0]!;
  const selectedPlan = INITIAL_MEMBERSHIP_PLANS.find((p) => p.id === selectedPlanId) ?? INITIAL_MEMBERSHIP_PLANS[0]!;
  const selectedAthlete = athletes.find((a) => a.id === selectedChildId);

  const steps = [
    { id: 1, label: t("enrol.steps.player") },
    { id: 2, label: t("enrol.steps.programme") },
    { id: 3, label: t("enrol.steps.plan") },
    { id: 4, label: t("enrol.steps.terms") },
    { id: 5, label: t("enrol.steps.payment") },
  ];

  // Navigation handlers
  const handleNext = async () => {
    setError("");

    if (currentStep === 1) {
      if (selectedChildId === "new") {
        if (!newChildName || !newChildDob) {
          setError("Please enter the child's full name and birth date.");
          return;
        }
        const created = await addChild({
          displayName: newChildName,
          dateOfBirth: newChildDob,
          gender: newChildGender,
        });
        setSelectedChildId(created.id);
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      if (!termsAccepted || !recurringConsent) {
        setError("You must agree to the Academy Terms and Recurring Billing Consent to proceed.");
        return;
      }
      setCurrentStep(5);
      return;
    }

    if (currentStep === 5) {
      setIsProcessing(true);
      try {
        // Complete enrolment and create membership
        await apiService.createMembership({
          athleteId: selectedChildId,
          offeringId: selectedOfferingId,
          membershipPlanId: selectedPlanId,
        });
        router.push(`/enrol/confirmation?athleteId=${selectedChildId}&planId=${selectedPlanId}&offeringId=${selectedOfferingId}`);
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
        {/* Step Indicator Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Badge variant="brand" size="md">
            Academy Enrolment Portal
          </Badge>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: "#18181B", margin: "12px 0 6px" }}>
            Join KHLIM Basketball Academy
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#71717A" }}>
            Register your child, pick a training schedule, and authorize secure membership.
          </p>
        </div>

        <StepIndicator steps={steps} currentStep={currentStep} />

        {error && (
          <div style={{ marginBottom: "24px" }}>
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px", alignItems: "flex-start" }}>
          {/* Main Step Form Card */}
          <Card style={{ padding: "32px", borderRadius: "16px" }}>
            {/* Step 1: Managed Athlete Selection */}
            {currentStep === 1 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.player.selectTitle")}</CardTitle>
                  <CardDescription>{t("enrol.player.selectSubtitle")}</CardDescription>
                </CardHeader>

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
                          Born {ath.dateOfBirth} • {ath.relationshipType ?? "Child"}
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
                        Add a new athlete profile to your guardian family account.
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
              </div>
            )}

            {/* Step 2: Select Programme & Offering */}
            {currentStep === 2 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.programme.selectTitle")}</CardTitle>
                  <CardDescription>{t("enrol.programme.selectSubtitle")}</CardDescription>
                </CardHeader>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
                  <RadioGroup
                    name="offeringSelection"
                    value={selectedOfferingId}
                    onChange={setSelectedOfferingId}
                    options={INITIAL_OFFERINGS.map((off) => ({
                      value: off.id,
                      title: `${off.programmeName} • ${off.dayOfWeek}s`,
                      description: `📍 ${off.venueName} (${off.court}) | ⏰ ${off.startTime} - ${off.endTime}`,
                      badge: (
                        <Badge variant="brand" size="sm">
                          {off.capacity - off.enrolledCount} spots left
                        </Badge>
                      ),
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Select Membership Plan */}
            {currentStep === 3 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.plan.selectTitle")}</CardTitle>
                  <CardDescription>{t("enrol.plan.selectSubtitle")}</CardDescription>
                </CardHeader>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                  <RadioGroup
                    name="planSelection"
                    value={selectedPlanId}
                    onChange={setSelectedPlanId}
                    options={INITIAL_MEMBERSHIP_PLANS.map((plan) => ({
                      value: plan.id,
                      title: plan.name,
                      description: (
                        <div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#18181B", margin: "4px 0" }}>
                            {formatCurrency(plan.monthlyAmount)}
                            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#71717A" }}> / month</span>
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "#52525B" }}>
                            {plan.sessionAllowance} • {plan.commitmentCycles} Months Commitment
                          </div>
                        </div>
                      ),
                      badge: plan.commitmentCycles === 3 ? (
                        <Badge variant="success" size="sm">Most Popular</Badge>
                      ) : undefined,
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Terms Review & Recurring Consent */}
            {currentStep === 4 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.terms.title")}</CardTitle>
                  <CardDescription>
                    Please review your commercial commitment before payment tokenization.
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
                      Agreed Commercial Summary (Audit Snapshot)
                    </div>
                    <div>• Athlete: <strong>{selectedAthlete?.displayName ?? newChildName}</strong></div>
                    <div>• Programme: <strong>{selectedOffering.programmeName}</strong> ({selectedOffering.dayOfWeek}s)</div>
                    <div>• Package: <strong>{selectedPlan.name}</strong></div>
                    <div>• Monthly Installment: <strong>{formatCurrency(selectedPlan.monthlyAmount)} / month</strong></div>
                    <div>• Commitment Duration: <strong>{selectedPlan.commitmentCycles} billing cycles</strong></div>
                  </div>

                  <Checkbox
                    label={
                      <span>
                        I authorize KHLIM to bill the monthly recurring amount of{" "}
                        <strong>{formatCurrency(selectedPlan.monthlyAmount)}</strong> on the agreed monthly schedule for {selectedPlan.commitmentCycles} installments.
                      </span>
                    }
                    checked={recurringConsent}
                    onChange={(e) => setRecurringConsent(e.target.checked)}
                  />

                  <Checkbox
                    label={
                      <span>
                        I have read and agree to the <Link href="/terms" target="_blank" style={{ color: "#F59E0B" }}>KHLIM Academy Terms of Service</Link>, Code of Conduct, and <Link href="/privacy" target="_blank" style={{ color: "#F59E0B" }}>Privacy Policy</Link>.
                      </span>
                    }
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Secure Checkout Handoff */}
            {currentStep === 5 && (
              <div>
                <CardHeader>
                  <CardTitle>{t("enrol.steps.payment")}</CardTitle>
                  <CardDescription>
                    Secure provider payment tokenization powered by external gateway.
                  </CardDescription>
                </CardHeader>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
                  <Alert variant="info" title="🔒 Provider-Hosted Card Tokenization">
                    Your card will be tokenized via our PCI-DSS Level 1 compliant gateway. KHLIM does not store full credit card numbers or CVVs.
                  </Alert>

                  <div
                    style={{
                      border: "1px solid #E4E4E7",
                      borderRadius: "12px",
                      padding: "24px",
                      backgroundColor: "#FAFAFA",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Payment Method</span>
                      <span style={{ fontSize: "0.8125rem", color: "#71717A" }}>Visa / Mastercard / DuitNow</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <Input label="Cardholder Name" defaultValue="Richie Lim" />
                      <Input label="Card Number" placeholder="4242 •••• •••• 4242" defaultValue="4242 8888 9999 4242" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Input label="Expiry Date" placeholder="MM/YY" defaultValue="12/28" />
                        <Input label="CVV" placeholder="•••" defaultValue="888" type="password" />
                      </div>
                    </div>
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
                {currentStep === 5 ? t("enrol.checkout.proceed") : `${t("common.next")} →`}
              </Button>
            </div>
          </Card>

          {/* Sticky Order Summary Sidebar */}
          <div style={{ position: "sticky", top: "90px" }}>
            <Card style={{ backgroundColor: "#FFFFFF", borderRadius: "16px", border: "1px solid #E4E4E7" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#18181B", margin: "0 0 16px" }}>
                Enrolment Summary
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Player</span>
                  <strong style={{ color: "#18181B" }}>
                    {selectedAthlete?.displayName ?? (newChildName || "New Player")}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Programme</span>
                  <strong style={{ color: "#18181B" }}>{selectedOffering.programmeName}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Time & Day</span>
                  <span style={{ color: "#18181B", textAlign: "right" }}>
                    {selectedOffering.dayOfWeek}s<br />
                    <span style={{ fontSize: "0.75rem", color: "#71717A" }}>{selectedOffering.startTime}</span>
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#71717A" }}>Selected Plan</span>
                  <strong style={{ color: "#18181B" }}>{selectedPlan.name}</strong>
                </div>

                <div style={{ borderTop: "1px solid #E4E4E7", margin: "8px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#18181B" }}>First Month Due:</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#18181B" }}>
                    {formatCurrency(selectedPlan.monthlyAmount)}
                  </span>
                </div>

                <div style={{ fontSize: "0.75rem", color: "#71717A" }}>
                  Recurring monthly cadence • {selectedPlan.commitmentCycles} total installments
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
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading enrolment wizard...</div>}>
      <EnrolmentWizardContent />
    </Suspense>
  );
}
