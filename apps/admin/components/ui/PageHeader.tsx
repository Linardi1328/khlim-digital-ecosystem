"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div style={{ marginBottom: "28px" }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumbs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.8125rem",
            color: "#64748B",
            marginBottom: "8px",
          }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <span style={{ color: "#94A3B8" }}>/</span>}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    style={{ color: "#64748B", textDecoration: "none" }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: isLast ? "#0F172A" : "#64748B", fontWeight: isLast ? 600 : 400 }}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1
              style={{
                fontSize: "1.875rem",
                fontWeight: 800,
                color: "#0F172A",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p style={{ fontSize: "0.9375rem", color: "#64748B", margin: "6px 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
