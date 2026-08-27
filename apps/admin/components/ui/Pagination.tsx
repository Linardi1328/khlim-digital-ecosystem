"use client";

import React, { useEffect } from "react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const displayPage = Math.min(Math.max(1, currentPage), safeTotalPages);
  const startItem = totalItems === 0 ? 0 : (displayPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(displayPage * itemsPerPage, totalItems);

  useEffect(() => {
    if (displayPage !== currentPage) {
      onPageChange(displayPage);
    }
  }, [currentPage, displayPage, onPageChange]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "12px 16px",
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid #E2E8F0",
        fontSize: "0.8125rem",
        color: "#64748B",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span>
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{" "}
          <strong>{totalItems}</strong> results
        </span>

        {onItemsPerPageChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label htmlFor="per-page-select" style={{ color: "#64748B" }}>
              Per page:
            </label>
            <select
              id="per-page-select"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                fontSize: "0.8125rem",
                borderRadius: "4px",
                border: "1px solid #CBD5E1",
                backgroundColor: "#F8FAFC",
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          type="button"
          onClick={() => onPageChange(displayPage - 1)}
          disabled={displayPage <= 1}
          aria-label="Previous page"
          style={{
            padding: "6px 12px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            borderRadius: "6px",
            border: "1px solid #CBD5E1",
            backgroundColor: displayPage <= 1 ? "#F1F5F9" : "#FFFFFF",
            color: displayPage <= 1 ? "#94A3B8" : "#0F172A",
            cursor: displayPage <= 1 ? "not-allowed" : "pointer",
          }}
        >
          ← Previous
        </button>

        <span style={{ padding: "0 8px", fontWeight: 600, color: "#0F172A" }}>
          Page {displayPage} of {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(displayPage + 1)}
          disabled={totalItems === 0 || displayPage >= safeTotalPages}
          aria-label="Next page"
          style={{
            padding: "6px 12px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            borderRadius: "6px",
            border: "1px solid #CBD5E1",
            backgroundColor:
              totalItems === 0 || displayPage >= safeTotalPages
                ? "#F1F5F9"
                : "#FFFFFF",
            color:
              totalItems === 0 || displayPage >= safeTotalPages
                ? "#94A3B8"
                : "#0F172A",
            cursor:
              totalItems === 0 || displayPage >= safeTotalPages
                ? "not-allowed"
                : "pointer",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
