"use client";

import React, { type ReactNode } from "react";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterItem {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (val: string) => void;
}

export interface FilterBarProps {
  filters?: FilterItem[];
  children?: ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
}

export function FilterBar({
  filters = [],
  children,
  onReset,
  hasActiveFilters = false,
}: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "12px 16px",
        backgroundColor: "#FFFFFF",
        borderRadius: "10px",
        border: "1px solid #E2E8F0",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "#64748B",
          fontSize: "0.8125rem",
          fontWeight: 600,
        }}
      >
        <span aria-hidden="true">⚡</span> Filters:
      </div>

      {filters.map((filter) => (
        <div
          key={filter.id}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <label
            htmlFor={`filter-${filter.id}`}
            style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}
          >
            {filter.label}:
          </label>
          <select
            id={`filter-${filter.id}`}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: "0.8125rem",
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              color: "#0F172A",
              outline: "none",
            }}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {children}

      {hasActiveFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: "#D97706",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
