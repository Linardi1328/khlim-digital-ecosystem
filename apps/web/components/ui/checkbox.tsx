"use client";

import React, {
  type InputHTMLAttributes,
  forwardRef,
  type ReactNode,
  useId,
} from "react";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id, style, ...props }, ref) => {
    const generatedId = useId();
    const checkId = id ?? `checkbox-${generatedId.replace(/:/g, "")}`;
    const errorId = error ? `${checkId}-error` : undefined;
    const describedBy = [props["aria-describedby"], errorId]
      .filter(Boolean)
      .join(" ") || undefined;

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
            aria-invalid={Boolean(error)}
            {...props}
            aria-describedby={describedBy}
            style={{
              width: "18px",
              height: "18px",
              accentColor: "#F59E0B",
              marginTop: "2px",
              cursor: "pointer",
              flexShrink: 0,
              ...style,
            }}
          />
          <div>{label}</div>
        </label>
        {error && (
          <span
            id={`${checkId}-error`}
            role="alert"
            style={{
              fontSize: "0.8125rem",
              color: "#B91C1C",
              fontWeight: 500,
              marginLeft: "28px",
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
