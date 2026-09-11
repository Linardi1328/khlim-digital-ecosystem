"use client";

import React, {
  type InputHTMLAttributes,
  forwardRef,
  useId,
} from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, style, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `input-${generatedId.replace(/:/g, "")}`;
    const feedbackId = error
      ? `${inputId}-error`
      : helperText
        ? `${inputId}-help`
        : undefined;
    const describedBy = [props["aria-describedby"], feedbackId]
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
          {...props}
          aria-describedby={describedBy}
          style={{
            padding: "10px 14px",
            fontSize: "0.9375rem",
            borderRadius: "8px",
            border: error ? "1px solid #EF4444" : "1px solid #D4D4D8",
            backgroundColor: "#FFFFFF",
            color: "#18181B",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "inherit",
            transition: "border-color 0.15s ease",
            ...style,
          }}
        />
        {error && (
          <span
            id={`${inputId}-error`}
            role="alert"
            style={{ fontSize: "0.8125rem", color: "#B91C1C", fontWeight: 500 }}
          >
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={`${inputId}-help`} style={{ fontSize: "0.8125rem", color: "#52525B" }}>
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
