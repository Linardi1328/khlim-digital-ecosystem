"use client";

import React, { type ReactNode } from "react";
import { I18nProvider } from "../lib/i18n-context";
import { AuthProvider } from "../lib/auth-context";
import { FamilyProvider } from "../lib/family-context";
import { ToastProvider } from "./ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <FamilyProvider>
          <ToastProvider>{children}</ToastProvider>
        </FamilyProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
