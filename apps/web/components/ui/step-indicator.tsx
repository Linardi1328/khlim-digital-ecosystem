"use client";

import React from "react";

export interface StepItem {
  id: number;
  label: string;
}

export interface StepIndicatorProps {
  steps: StepItem[];
  currentStep: number;
  ariaLabel?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  ariaLabel,
}: StepIndicatorProps) {
  const edgeInset = steps.length > 0 ? `${100 / (steps.length * 2)}%` : "16%";

  return (
    <div
      className="khlim-step-indicator"
      role={ariaLabel ? "navigation" : undefined}
      aria-label={ariaLabel}
    >
      <div className="khlim-step-indicator-track">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className="khlim-step-indicator-item"
            >
              <div
                className="khlim-step-indicator-circle"
                style={{
                  backgroundColor: isCompleted
                    ? "#10B981"
                    : isCurrent
                      ? "#F59E0B"
                      : "#E4E4E7",
                  color: isCompleted || isCurrent ? "#18181B" : "#71717A",
                  boxShadow: isCurrent ? "0 0 0 4px #FEF3C7" : undefined,
                }}
              >
                {isCompleted ? "✓" : step.id}
              </div>
              <span
                className="khlim-step-indicator-label"
                style={{
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent
                    ? "#18181B"
                    : isCompleted
                      ? "#065F46"
                      : "#52525B",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}

        <div
          className="khlim-step-indicator-line"
          style={{
            left: edgeInset,
            right: edgeInset,
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: "#10B981",
              width:
                steps.length > 1
                  ? `${((currentStep - 1) / (steps.length - 1)) * 100}%`
                  : "0%",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
