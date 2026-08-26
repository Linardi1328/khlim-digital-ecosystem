"use client";

import React, { type ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      style,
      ...props
    },
    ref,
  ) => {
    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontWeight: 600,
      fontFamily: "inherit",
      borderRadius: "8px",
      cursor: disabled || isLoading ? "not-allowed" : "pointer",
      opacity: disabled || isLoading ? 0.6 : 1,
      transition: "all 0.15s ease-in-out",
      textDecoration: "none",
      border: "1px solid transparent",
      outline: "none",
      whiteSpace: "nowrap",
      userSelect: "none",
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: "#F59E0B",
        color: "#18181B",
        borderColor: "#D97706",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      },
      secondary: {
        backgroundColor: "#18181B",
        color: "#FFFFFF",
        borderColor: "#18181B",
      },
      outline: {
        backgroundColor: "#FFFFFF",
        color: "#18181B",
        borderColor: "#D4D4D8",
      },
      ghost: {
        backgroundColor: "transparent",
        color: "#3F3F46",
        borderColor: "transparent",
      },
      danger: {
        backgroundColor: "#EF4444",
        color: "#FFFFFF",
        borderColor: "#DC2626",
      },
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: "6px 12px",
        fontSize: "0.875rem",
        lineHeight: "1.25rem",
      },
      md: {
        padding: "10px 18px",
        fontSize: "0.9375rem",
        lineHeight: "1.375rem",
      },
      lg: {
        padding: "14px 24px",
        fontSize: "1.0625rem",
        lineHeight: "1.5rem",
      },
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{
          ...baseStyle,
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        {...props}
      >
        {isLoading && (
          <span
            style={{
              display: "inline-block",
              width: "14px",
              height: "14px",
              border: "2px solid currentColor",
              borderRightColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
