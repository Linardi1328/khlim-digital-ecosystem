"use client";

import React, { type ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyState,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          color: "#64748B",
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>⏳</div>
        <div>Loading operational records...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      emptyState || (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px dashed #CBD5E1",
            color: "#64748B",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📋</div>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>No records found</div>
          <div style={{ fontSize: "0.875rem", marginTop: "4px" }}>
            Try adjusting your search criteria or filters.
          </div>
        </div>
      )
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        overflowX: "auto",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <table
        className="table-responsive-stacked"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "0.875rem",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "12px 16px",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  width: col.width,
                  textAlign: col.align || "left",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              style={{
                borderBottom: rowIdx === data.length - 1 ? "none" : "1px solid #F1F5F9",
                cursor: onRowClick ? "pointer" : "default",
                backgroundColor: "#FFFFFF",
                transition: "background-color 0.12s ease",
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = "#F8FAFC";
              }}
              onMouseLeave={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.header}
                  style={{
                    padding: "14px 16px",
                    color: "#0F172A",
                    verticalAlign: "middle",
                    textAlign: col.align || "left",
                  }}
                >
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, any>)[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
