"use client";

import React, { type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  className = "",
  ...props
}: ButtonProps) {
  let bg = "#F59E0B";
  let color = "#18181B";
  let border = "1px solid transparent";
  let hoverBg = "#D97706";

  if (variant === "secondary") {
    bg = "#18181B";
    color = "#FFFFFF";
    hoverBg = "#27272A";
  } else if (variant === "outline") {
    bg = "#FFFFFF";
    color = "#0F172A";
    border = "1px solid #CBD5E1";
    hoverBg = "#F8FAFC";
  } else if (variant === "danger") {
    bg = "#DC2626";
    color = "#FFFFFF";
    hoverBg = "#B91C1C";
  } else if (variant === "ghost") {
    bg = "transparent";
    color = "#475569";
    hoverBg = "#F1F5F9";
  }

  const sizeStyles = {
    sm: { padding: "6px 12px", fontSize: "0.8125rem", borderRadius: "6px" },
    md: { padding: "8px 16px", fontSize: "0.875rem", borderRadius: "8px" },
    lg: { padding: "12px 20px", fontSize: "1rem", borderRadius: "8px" },
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: 600,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.6 : 1,
        backgroundColor: bg,
        color,
        border,
        transition: "all 0.12s ease",
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {isLoading && <span aria-hidden="true">⏳</span>}
      {!isLoading && leftIcon && <span aria-hidden="true">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </button>
  );
}
