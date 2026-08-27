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
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default",
  onClick,
}: MetricCardProps) {
  let borderLeftColor = "#E2E8F0";
  if (variant === "warning") borderLeftColor = "#F59E0B";
  if (variant === "success") borderLeftColor = "#10B981";
  if (variant === "danger") borderLeftColor = "#EF4444";

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        borderLeft: `4px solid ${borderLeftColor}`,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </span>
        {icon && (
          <div style={{ fontSize: "1.25rem", color: "#64748B" }}>{icon}</div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
        <div
          style={{
            fontSize: "1.875rem",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {trend && (
          <span
            style={{
              fontSize: "0.8125rem",
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

      {subtitle && (
        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{subtitle}</div>
      )}
    </div>
  );
}
