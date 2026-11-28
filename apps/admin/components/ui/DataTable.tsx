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
        role="status"
        aria-live="polite"
        style={{
          padding: "40px 24px",
          textAlign: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          color: "#64748B",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "3px solid #E2E8F0",
            borderTopColor: "#F59E0B",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
          Loading operational records...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      emptyState || (
        <div
          style={{
            padding: "44px 24px",
            textAlign: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: "10px",
            border: "1px dashed #CBD5E1",
            color: "#64748B",
          }}
        >
          <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "1rem" }}>
            No records found
          </div>
          <div style={{ fontSize: "0.84rem", marginTop: "4px" }}>
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
        borderRadius: "10px",
        border: "1px solid #E2E8F0",
        overflowX: "auto",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <table
        className="table-responsive-stacked"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "0.84rem",
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "11px 14px",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  width: col.width,
                  textAlign: col.align || "left",
                  whiteSpace: "nowrap",
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
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick && onRowClick(item)}
              onKeyDown={(e) => {
                if (!onRowClick || e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(item);
                }
              }}
              style={{
                borderBottom:
                  rowIdx === data.length - 1 ? "none" : "1px solid #F1F5F9",
                cursor: onRowClick ? "pointer" : "default",
                backgroundColor: "#FFFFFF",
                transition: "background-color 0.12s ease",
                outlineOffset: "-2px",
              }}
              onMouseEnter={(e) => {
                if (onRowClick)
                  e.currentTarget.style.backgroundColor = "#FFFDF5";
              }}
              onMouseLeave={(e) => {
                if (onRowClick)
                  e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
              onFocus={(e) => {
                if (onRowClick)
                  e.currentTarget.style.backgroundColor = "#FFFDF5";
              }}
              onBlur={(e) => {
                if (onRowClick)
                  e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.header}
                  style={{
                    padding: "12px 14px",
                    color: "#0F172A",
                    verticalAlign: "middle",
                    textAlign: col.align || "left",
                  }}
                >
                  {col.render
                    ? col.render(item)
                    : (((item as Record<string, unknown>)[
                        col.key
                      ] as ReactNode) ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
