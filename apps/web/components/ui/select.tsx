"use client";

import React, { type SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, style, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          width: "100%",
        }}
      >
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#27272A",
            }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
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
            cursor: "pointer",
            ...style,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span
            style={{ fontSize: "0.8125rem", color: "#DC2626", fontWeight: 500 }}
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
