"use client";

import React, { useState, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Drawer } from "../ui/Drawer";

export interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#F8FAFC",
      }}
    >
      {/* Desktop Sidebar */}
      <div className="admin-desktop-sidebar">
        <AdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        title="Operations Menu"
        width="280px"
      >
        <AdminSidebar onNavigate={() => setIsMobileNavOpen(false)} />
      </Drawer>

      {/* Main Content Layout */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <AdminHeader
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main
          style={{
            flex: 1,
            padding: "28px 28px 60px",
            maxWidth: "1440px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
