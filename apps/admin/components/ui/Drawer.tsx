"use client";

import React, { useEffect, useRef, useId, type ReactNode } from "react";
import { registerModalFocusTrap } from "../../lib/modal-focus";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "540px",
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    return registerModalFocusTrap({
      container: drawerRef.current,
      onClose: () => onCloseRef.current(),
    });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        className="admin-drawer-panel"
        style={{
          width: "100%",
          maxWidth: width,
          minWidth: 0,
          backgroundColor: "#FFFFFF",
          boxShadow: "-10px 0 25px -5px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          outline: "none",
          animation: "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Drawer Header */}
        <div
          className="admin-drawer-header"
          style={{
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#0F172A",
                overflowWrap: "anywhere",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <div
                id={descId}
                style={{
                  fontSize: "0.8125rem",
                  color: "#64748B",
                  marginTop: "4px",
                  lineHeight: 1.45,
                  overflowWrap: "anywhere",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              color: "#475569",
              cursor: "pointer",
              fontSize: "1.1rem",
              minWidth: "40px",
              minHeight: "40px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div
          className="admin-drawer-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div
            className="admin-drawer-footer"
            style={{
              borderTop: "1px solid #E2E8F0",
              backgroundColor: "#F8FAFC",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
