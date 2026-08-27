"use client";

import React, { type HTMLAttributes, type ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "danger";

type AlertVariantStyle = {
  bg: string;
  border: string;
  text: string;
  titleColor: string;
};

export interface AlertProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  variant?: AlertVariant;
  title?: ReactNode;
  icon?: ReactNode;
}

export function Alert({
  variant = "info",
  title,
  icon,
  children,
  style,
  ...props
}: AlertProps) {
  const variantStyles: Record<AlertVariant, AlertVariantStyle> = {
    info: {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      text: "#1E40AF",
      titleColor: "#1E3A8A",
    },
    success: {
      bg: "#ECFDF5",
      border: "#A7F3D0",
      text: "#065F46",
      titleColor: "#064E3B",
    },
    warning: {
      bg: "#FFFBEB",
      border: "#FDE68A",
      text: "#92400E",
      titleColor: "#78350F",
    },
    danger: {
      bg: "#FEF2F2",
      border: "#FECACA",
      text: "#991B1B",
      titleColor: "#7F1D1D",
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "10px",
        backgroundColor: currentVariant.bg,
        border: `1px solid ${currentVariant.border}`,
        color: currentVariant.text,
        fontSize: "0.875rem",
        lineHeight: 1.5,
        ...style,
      }}
      {...props}
    >
      {icon && <div style={{ flexShrink: 0, marginTop: "2px" }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        {title && (
          <div
            style={{
              fontWeight: 700,
              color: currentVariant.titleColor,
              marginBottom: "2px",
            }}
          >
            {title}
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}
