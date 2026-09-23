"use client";

import React, { type ReactNode, useEffect, useRef, useId } from "react";
import { useI18n } from "../../lib/i18n-context";

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
  const { t } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };

    if (isOpen) {
      previousActiveElement.current =
        document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        const focusable = sheetRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
      }, 50);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
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
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          overflowY: "auto",
          zIndex: 51,
          outline: "none",
          ...positionStyles[position],
        }}
      >
        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            {title && (
              <h3
                id={titleId}
                style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}
              >
                {title}
              </h3>
            )}
            <button
              onClick={onClose}
              aria-label={t("layout.closeNavigation")}
              style={{
                minWidth: "44px",
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                fontSize: "1.25rem",
                color: "#71717A",
                cursor: "pointer",
                padding: "4px",
                lineHeight: 1,
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
