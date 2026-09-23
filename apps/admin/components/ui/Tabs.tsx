"use client";

import React, { type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        borderBottom: "1px solid #E2E8F0",
        marginBottom: "20px",
        overflowX: "auto",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: "10px 16px",
              fontSize: "0.875rem",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "#0F172A" : "#64748B",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: isActive
                ? "2px solid #F59E0B"
                : "2px solid transparent",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.12s ease",
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  backgroundColor: isActive ? "#FEF3C7" : "#F1F5F9",
                  color: isActive ? "#92400E" : "#64748B",
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
