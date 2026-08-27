"use client";

import React, { type HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverable = false, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E4E4E7",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          padding: "20px",
          transition: hoverable ? "all 0.2s ease-in-out" : undefined,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export function CardHeader({
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        marginBottom: "16px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  style,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      style={{
        fontSize: "1.25rem",
        fontWeight: 700,
        color: "#18181B",
        margin: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  style,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      style={{
        fontSize: "0.875rem",
        color: "#71717A",
        margin: 0,
        lineHeight: 1.5,
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div style={{ ...style }} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: "1px solid #F4F4F5",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
