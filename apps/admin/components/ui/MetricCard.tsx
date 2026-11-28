"use client";

import React, { type ReactNode } from "react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: ReactNode;
  variant?: "default" | "warning" | "success" | "danger";
  actionHint?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default",
  actionHint,
  interactive = false,
  onClick,
}: MetricCardProps) {
  let borderLeftColor = "#18181B";
  if (variant === "warning") borderLeftColor = "#F59E0B";
  if (variant === "success") borderLeftColor = "#10B981";
  if (variant === "danger") borderLeftColor = "#DC2626";

  const isClickable = Boolean(onClick) || interactive;

  return (
    <div
      onClick={onClick}
      className={isClickable ? "admin-metric-card-interactive" : undefined}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "10px",
        border: "1px solid #E2E8F0",
        borderLeft: `4px solid ${borderLeftColor}`,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "10px",
        height: "100%",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        cursor: isClickable ? "pointer" : "default",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            lineHeight: 1.3,
          }}
        >
          {title}
        </span>
        {icon && (
          <div
            aria-hidden="true"
            style={{ fontSize: "1rem", color: "#64748B", flexShrink: 0 }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
        <div
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </div>
        {trend && (
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: trend.isPositive ? "#059669" : "#DC2626",
              backgroundColor: trend.isPositive ? "#ECFDF5" : "#FEF2F2",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>

      {(subtitle || actionHint) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "0.75rem",
            color: "#64748B",
            lineHeight: 1.35,
          }}
        >
          <span>{subtitle}</span>
          {actionHint && (
            <span
              style={{
                color: "#B45309",
                fontWeight: 700,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {actionHint} →
            </span>
          )}
        </div>
      )}
    </div>
  );
}
