"use client";

import React, { useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  required,
  id,
  style,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#334155",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {label}
          {required && <span style={{ color: "#DC2626" }}>*</span>}
        </label>
      )}

      <input
        id={inputId}
        required={required}
        aria-invalid={!!error}
        style={{
          padding: "8px 12px",
          fontSize: "0.875rem",
          borderRadius: "8px",
          border: error ? "1px solid #DC2626" : "1px solid #CBD5E1",
          backgroundColor: props.disabled ? "#F1F5F9" : "#FFFFFF",
          color: props.disabled ? "#64748B" : "#0F172A",
          outline: "none",
          ...style,
        }}
        {...props}
      />

      {error && (
        <span style={{ fontSize: "0.75rem", color: "#DC2626", fontWeight: 500 }}>
          {error}
        </span>
      )}

      {!error && helperText && (
        <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
          {helperText}
        </span>
      )}
    </div>
  );
}
