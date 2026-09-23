"use client";

import React, { type ReactNode } from "react";
import { AuthProvider } from "../lib/auth-context";

export function AdminProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
