"use client";

import React, { type ReactNode } from "react";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
}

export function ErrorState({
  title = "Operational Error",
  message = "An error occurred while communicating with the backend services.",
  onRetry,
  action,
}: ErrorStateProps) {
  return (
    <div
      style={{
        padding: "32px 24px",
        backgroundColor: "#FEF2F2",
        borderRadius: "12px",
        border: "1px solid #FECACA",
        color: "#991B1B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "2rem" }}>⚠️</div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "#7F1D1D" }}>
        {title}
      </h3>
      <p style={{ fontSize: "0.875rem", margin: 0, maxWidth: "460px", color: "#991B1B" }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "8px 16px",
              backgroundColor: "#DC2626",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "0.8125rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Retry Operation
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
