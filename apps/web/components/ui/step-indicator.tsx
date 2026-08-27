"use client";

import React from "react";

export interface StepItem {
  id: number;
  label: string;
}

export interface StepIndicatorProps {
  steps: StepItem[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div style={{ width: "100%", padding: "12px 0 24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                zIndex: 2,
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: isCompleted
                    ? "#10B981"
                    : isCurrent
                      ? "#F59E0B"
                      : "#E4E4E7",
                  color: isCompleted || isCurrent ? "#18181B" : "#71717A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  boxShadow: isCurrent ? "0 0 0 4px #FEF3C7" : undefined,
                  transition: "all 0.2s ease",
                }}
              >
                {isCompleted ? "✓" : step.id}
              </div>
              <span
                style={{
                  marginTop: "8px",
                  fontSize: "0.75rem",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent
                    ? "#18181B"
                    : isCompleted
                      ? "#065F46"
                      : "#71717A",
                  textAlign: "center",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            top: "18px",
            left: "10%",
            right: "10%",
            height: "2px",
            backgroundColor: "#E4E4E7",
            zIndex: 1,
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: "#10B981",
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
