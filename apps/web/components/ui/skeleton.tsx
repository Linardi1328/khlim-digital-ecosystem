"use client";

import React, { type HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function Skeleton({
  width = "100%",
  height = "20px",
  borderRadius = "6px",
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "#E4E4E7",
        animation: "pulse 1.5s ease-in-out infinite",
        ...style,
      }}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E4E4E7",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <Skeleton width="40%" height="24px" />
      <Skeleton width="90%" height="16px" />
      <Skeleton width="60%" height="16px" />
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Skeleton width="30%" height="32px" />
        <Skeleton width="25%" height="32px" />
      </div>
    </div>
  );
}
