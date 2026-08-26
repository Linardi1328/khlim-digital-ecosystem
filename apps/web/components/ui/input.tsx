"use client";

import React, { type InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#27272A",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          style={{
            padding: "10px 14px",
            fontSize: "0.9375rem",
            borderRadius: "8px",
            border: error ? "1px solid #EF4444" : "1px solid #D4D4D8",
            backgroundColor: "#FFFFFF",
            color: "#18181B",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "inherit",
            transition: "border-color 0.15s ease",
            ...style,
          }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: "0.8125rem", color: "#DC2626", fontWeight: 500 }}>
            {error}
          </span>
        )}
        {!error && helperText && (
          <span style={{ fontSize: "0.8125rem", color: "#71717A" }}>
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
