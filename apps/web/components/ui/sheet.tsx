"use client";

import React, {
  type ReactNode,
  useEffect,
  useRef,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n-context";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  position?: "left" | "right" | "bottom";
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const candidates =
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(candidates).filter((el) => {
    if (
      el.hasAttribute("disabled") ||
      el.getAttribute("aria-hidden") === "true"
    ) {
      return false;
    }
    if (el.tabIndex < 0) {
      return false;
    }
    if (typeof window !== "undefined") {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
    }
    return true;
  });
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  position = "bottom",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: SheetProps) {
  const { t } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current =
      document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      const focusable = getFocusableElements(sheetRef.current);
      const first = focusable[0];
      if (first) {
        first.focus();
      } else {
        sheetRef.current?.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = getFocusableElements(sheetRef.current);

        // Handle the case where there are no focusable descendants
        if (focusable.length === 0) {
          e.preventDefault();
          sheetRef.current?.focus();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        if (!firstElement || !lastElement) {
          e.preventDefault();
          sheetRef.current?.focus();
          return;
        }
        const active = document.activeElement;

        if (e.shiftKey) {
          // Shift + Tab: from first focusable control cycles to the last
          if (
            active === firstElement ||
            !sheetRef.current?.contains(active) ||
            active === sheetRef.current
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: from final focusable control cycles to the first
          if (
            active === lastElement ||
            !sheetRef.current?.contains(active) ||
            active === sheetRef.current
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (!sheetRef.current) return;
      if (!sheetRef.current.contains(e.target as Node)) {
        const focusable = getFocusableElements(sheetRef.current);
        const first = focusable[0];
        if (first) {
          first.focus();
        } else {
          sheetRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

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

  return createPortal(
    <div
      data-testid="sheet-overlay"
      className="sheet-overlay"
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
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby ?? (title ? titleId : undefined)}
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
    </div>,
    document.body,
  );
}
