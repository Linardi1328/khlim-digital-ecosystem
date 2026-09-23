"use client";

import React, { type HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "brand";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  style,
  ...props
}: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: 600,
    borderRadius: "9999px",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    success: {
      backgroundColor: "#ECFDF5",
      color: "#065F46",
      borderColor: "#A7F3D0",
    },
    warning: {
      backgroundColor: "#FFFBEB",
      color: "#92400E",
      borderColor: "#FDE68A",
    },
    danger: {
      backgroundColor: "#FEF2F2",
      color: "#991B1B",
      borderColor: "#FECACA",
    },
    info: {
      backgroundColor: "#EFF6FF",
      color: "#1E40AF",
      borderColor: "#BFDBFE",
    },
    neutral: {
      backgroundColor: "#F4F4F5",
      color: "#3F3F46",
      borderColor: "#E4E4E7",
    },
    brand: {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
      borderColor: "#FDE68A",
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: "2px 8px",
      fontSize: "0.75rem",
      lineHeight: "1rem",
    },
    md: {
      padding: "4px 10px",
      fontSize: "0.8125rem",
      lineHeight: "1.125rem",
    },
  };

  return (
    <span
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
