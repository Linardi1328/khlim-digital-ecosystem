"use client";

import React from "react";

export interface LoadingStateProps {
  message?: string;
  height?: string | number;
}

export function LoadingState({
  message = "Loading operational data...",
  height = "240px",
}: LoadingStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        height,
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        color: "#64748B",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          border: "3px solid #E2E8F0",
          borderTopColor: "#F59E0B",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{message}</span>
    </div>
  );
}
