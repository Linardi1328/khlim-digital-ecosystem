"use client";

import React, { useEffect, useState } from "react";

export interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 250,
  className = "",
}: SearchInputProps) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localVal, debounceMs, onChange, value]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
        maxWidth: "320px",
        minWidth: 0,
        flex: "1 1 240px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "12px",
          color: "#94A3B8",
          fontSize: "0.875rem",
          pointerEvents: "none",
        }}
      >
        🔍
      </span>
      <input
        type="search"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          width: "100%",
          minWidth: 0,
          padding: "8px 32px 8px 34px",
          fontSize: "0.875rem",
          backgroundColor: "#FFFFFF",
          border: "1px solid #CBD5E1",
          borderRadius: "8px",
          color: "#0F172A",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
      />
      {localVal && (
        <button
          type="button"
          onClick={() => {
            setLocalVal("");
            onChange("");
          }}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: "8px",
            background: "none",
            border: "none",
            color: "#94A3B8",
            cursor: "pointer",
            fontSize: "0.75rem",
            padding: "4px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
