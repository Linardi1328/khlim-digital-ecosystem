"use client";

import React, {
  type SelectHTMLAttributes,
  forwardRef,
  useId,
} from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2352525B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, style, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? `select-${generatedId.replace(/:/g, "")}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [props["aria-describedby"], errorId]
      .filter(Boolean)
      .join(" ") || undefined;

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
          {...props}
          aria-describedby={describedBy}
          style={{
            padding: "10px 46px 10px 14px",
            fontSize: "0.9375rem",
            borderRadius: "8px",
            border: error ? "1px solid #EF4444" : "1px solid #D4D4D8",
            backgroundColor: "#FFFFFF",
            backgroundImage: chevron,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 16px center",
            backgroundSize: "15px 15px",
            WebkitAppearance: "none",
            appearance: "none",
            color: "#18181B",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "inherit",
            cursor: "pointer",
            ...style,
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span
            id={`${selectId}-error`}
            role="alert"
            style={{ fontSize: "0.8125rem", color: "#B91C1C", fontWeight: 500 }}
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
