"use client";

import React, { type ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = "📋",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px dashed #CBD5E1",
        color: "#64748B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>{icon}</div>
      <h3
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "#0F172A",
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: "0.875rem",
            color: "#64748B",
            margin: 0,
            maxWidth: "420px",
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "8px" }}>{action}</div>}
    </div>
  );
}
