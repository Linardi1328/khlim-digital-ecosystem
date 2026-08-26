"use client";

import React, { createContext, useContext, useState, type ReactNode } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (msg: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (msg: Omit<ToastMessage, "id">) => {
    const id = Date.now().toString(36);
    const newToast: ToastMessage = { id, ...msg };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "380px",
          width: "calc(100% - 48px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const bgMap: Record<ToastVariant, string> = {
            success: "#065F46",
            error: "#991B1B",
            warning: "#92400E",
            info: "#1E3A8A",
          };
          return (
            <div
              key={t.id}
              style={{
                backgroundColor: bgMap[t.variant ?? "info"],
                color: "#FFFFFF",
                padding: "12px 16px",
                borderRadius: "8px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "8px",
                pointerEvents: "auto",
                animation: "slideIn 0.2s ease-out",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>{t.title}</div>
                {t.description && (
                  <div style={{ fontSize: "0.8125rem", opacity: 0.9, marginTop: "2px" }}>
                    {t.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "1rem",
                  lineHeight: 1,
                  opacity: 0.7,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
    };
  }
  return ctx;
}
