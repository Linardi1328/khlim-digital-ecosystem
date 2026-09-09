"use client";

import React, {
  forwardRef,
  useState,
  type InputHTMLAttributes,
} from "react";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  showLabel: string;
  hideLabel: string;
  error?: string;
  helperText?: string;
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {hidden ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9.5 5 9.5 8a8.8 8.8 0 0 1-2 3.8" />
          <path d="M6.6 6.6C4.1 8.2 2.5 10.4 2.5 12c0 3 4 8 9.5 8a10.4 10.4 0 0 0 4.1-.8" />
        </>
      ) : (
        <>
          <path d="M2.5 12s3.5-8 9.5-8 9.5 8 9.5 8-3.5 8-9.5 8-9.5-8-9.5-8Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      showLabel,
      hideLabel,
      error,
      helperText,
      id,
      style,
      ...props
    },
    ref,
  ) => {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          width: "100%",
        }}
      >
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
        <div style={{ position: "relative" }}>
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={Boolean(error)}
            style={{
              padding: "10px 48px 10px 14px",
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
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? hideLabel : showLabel}
            title={visible ? hideLabel : showLabel}
            style={{
              position: "absolute",
              top: "50%",
              right: 6,
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              display: "grid",
              placeItems: "center",
              border: 0,
              borderRadius: 6,
              background: "transparent",
              color: "#52525B",
              cursor: "pointer",
            }}
          >
            <EyeIcon hidden={visible} />
          </button>
        </div>
        {error && (
          <span
            style={{ fontSize: "0.8125rem", color: "#DC2626", fontWeight: 500 }}
          >
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

PasswordInput.displayName = "PasswordInput";
