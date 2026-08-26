"use client";

import React, { type ReactNode, useEffect } from "react";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  position?: "left" | "right" | "bottom";
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  position = "bottom",
}: SheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionStyles: Record<string, React.CSSProperties> = {
    bottom: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: "85vh",
      borderTopLeftRadius: "20px",
      borderTopRightRadius: "20px",
    },
    left: {
      position: "fixed",
      top: 0,
      bottom: 0,
      left: 0,
      width: "300px",
      maxWidth: "85vw",
      borderTopRightRadius: "16px",
      borderBottomRightRadius: "16px",
    },
    right: {
      position: "fixed",
      top: 0,
      bottom: 0,
      right: 0,
      width: "300px",
      maxWidth: "85vw",
      borderTopLeftRadius: "16px",
      borderBottomLeftRadius: "16px",
    },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          overflowY: "auto",
          zIndex: 51,
          ...positionStyles[position],
        }}
      >
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            {title && <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>{title}</h3>}
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.25rem",
                color: "#71717A",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
