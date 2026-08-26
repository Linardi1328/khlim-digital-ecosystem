"use client";

import React, { type ReactNode } from "react";

export interface RadioOption<T extends string = string> {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string = string> {
  name: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
}

export function RadioGroup<T extends string = string>({
  name,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps<T>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "16px",
              borderRadius: "10px",
              border: isSelected ? "2px solid #F59E0B" : "1px solid #E4E4E7",
              backgroundColor: isSelected ? "#FFFDF5" : "#FFFFFF",
              cursor: option.disabled ? "not-allowed" : "pointer",
              opacity: option.disabled ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              style={{
                marginTop: "3px",
                accentColor: "#F59E0B",
                width: "18px",
                height: "18px",
                cursor: "pointer",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <span style={{ fontWeight: 600, fontSize: "1rem", color: "#18181B" }}>
                  {option.title}
                </span>
                {option.badge && <div>{option.badge}</div>}
              </div>
              {option.description && (
                <div style={{ fontSize: "0.875rem", color: "#71717A", marginTop: "4px" }}>
                  {option.description}
                </div>
              )}
            </div>
          </label>
        );
      })}
      {error && (
        <span style={{ fontSize: "0.8125rem", color: "#DC2626", fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
}
