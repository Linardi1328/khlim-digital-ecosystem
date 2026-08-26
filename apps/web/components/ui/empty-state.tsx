"use client";

import React, { type ReactNode } from "react";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px dashed #D4D4D8",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {icon ? (
        <div style={{ marginBottom: "16px", color: "#71717A" }}>{icon}</div>
      ) : (
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#F4F4F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            marginBottom: "16px",
            color: "#71717A",
          }}
        >
          🏀
        </div>
      )}
      <h4 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#18181B", margin: "0 0 8px" }}>
        {title}
      </h4>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#71717A",
          maxWidth: "400px",
          margin: "0 0 20px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
