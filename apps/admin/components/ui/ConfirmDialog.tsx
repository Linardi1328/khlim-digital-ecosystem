"use client";

import React, { useEffect, useRef, useId, type ReactNode } from "react";
import { registerModalFocusTrap } from "../../lib/modal-focus";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    return registerModalFocusTrap({
      container: dialogRef.current,
      onClose: () => onCloseRef.current(),
      canCloseOnEscape: () => !isLoadingRef.current,
    });
  }, [isOpen]);

  if (!isOpen) return null;

  let confirmBg = "#DC2626";
  if (variant === "warning") confirmBg = "#D97706";
  if (variant === "primary") confirmBg = "#F59E0B";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(2px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#FFFFFF",
          borderRadius: "14px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
          padding: "24px",
          outline: "none",
        }}
      >
        <h3
          id={titleId}
          style={{
            margin: "0 0 8px",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#0F172A",
          }}
        >
          {title}
        </h3>
        <div
          id={descId}
          style={{
            fontSize: "0.875rem",
            color: "#64748B",
            lineHeight: 1.5,
            marginBottom: "24px",
          }}
        >
          {description}
        </div>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor: "#F1F5F9",
              color: "#334155",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            style={{
              padding: "8px 16px",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor: confirmBg,
              color: variant === "primary" ? "#18181B" : "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              opacity: isLoading || confirmDisabled ? 0.55 : 1,
              cursor: isLoading || confirmDisabled ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isLoading && <span>⏳</span>}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
