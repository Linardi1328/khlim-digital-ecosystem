"use client";

import React from "react";

export interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "md", className = "" }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  let bg = "#F1F5F9";
  let text = "#475569";
  let border = "#CBD5E1";
  let icon = "•";

  if (["ACTIVE", "PAID", "OPEN", "COMPLETED"].includes(normalized)) {
    bg = "#ECFDF5";
    text = "#065F46";
    border = "#A7F3D0";
    icon = "✓";
  } else if (["PENDING", "PROCESSING", "SCHEDULED", "DRAFT"].includes(normalized)) {
    bg = "#FFFBEB";
    text = "#92400E";
    border = "#FDE68A";
    icon = "⏳";
  } else if (["FAILED", "SUSPENDED", "CANCELLED", "OVERDUE", "CLOSED", "DEACTIVATED"].includes(normalized)) {
    bg = "#FEF2F2";
    text = "#991B1B";
    border = "#FECACA";
    icon = "✕";
  } else if (["EXPIRED", "INACTIVE"].includes(normalized)) {
    bg = "#F4F4F5";
    text = "#71717A";
    border = "#E4E4E7";
    icon = "—";
  }

  const isSmall = size === "sm";

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? "4px" : "6px",
        padding: isSmall ? "2px 8px" : "4px 10px",
        borderRadius: "9999px",
        fontSize: isSmall ? "0.6875rem" : "0.75rem",
        fontWeight: 700,
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: isSmall ? "0.625rem" : "0.75rem" }}>
        {icon}
      </span>
      <span>{normalized}</span>
    </span>
  );
}
