"use client";

import React, { type InputHTMLAttributes, forwardRef, type ReactNode } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id, style, ...props }, ref) => {
    const checkId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label
          htmlFor={checkId}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            fontSize: "0.875rem",
            color: "#27272A",
            cursor: "pointer",
            lineHeight: 1.4,
          }}
        >
          <input
            ref={ref}
            type="checkbox"
            id={checkId}
            style={{
              width: "18px",
              height: "18px",
              accentColor: "#F59E0B",
              marginTop: "2px",
              cursor: "pointer",
              ...style,
            }}
            {...props}
          />
          <div>{label}</div>
        </label>
        {error && (
          <span style={{ fontSize: "0.8125rem", color: "#DC2626", fontWeight: 500, marginLeft: "28px" }}>
            {error}
          </span>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
