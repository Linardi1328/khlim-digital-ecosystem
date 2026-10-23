"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../../lib/auth-context";
import {
  ADMIN_SECTIONS,
  canViewAdminSection,
  canViewAdminPage,
  getAdminSectionForPath,
} from "./admin-sections";

export interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AdminSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { role } = useAdminAuth();

  const activeSection = getAdminSectionForPath(pathname)?.section;
  const [expandedSection, setExpandedSection] = useState<string | null>(
    activeSection?.href ?? null,
  );

  useEffect(() => {
    if (activeSection) setExpandedSection(activeSection.href);
  }, [pathname, activeSection?.href]);

  return (
    <aside
      aria-label="Admin Operations Sidebar"
      style={{
        width: isCollapsed ? "72px" : "260px",
        backgroundColor: "#18181B",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid #27272A",
        transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          minHeight: "72px",
          padding: isCollapsed ? "0 14px" : "0 16px",
          borderBottom: "1px solid #27272A",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          gap: 8,
        }}
      >
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="KHLIM Admin dashboard"
          style={{
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            overflow: "hidden",
          }}
        >
          <img
            src="/khs-academy-logo.webp"
            alt=""
            aria-hidden="true"
            width={37}
            height={44}
            style={{
              width: 37,
              height: 44,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          {!isCollapsed && (
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "1.0625rem",
                  color: "#FFFFFF",
                  letterSpacing: "0.04em",
                  lineHeight: 1.1,
                }}
              >
                KHLIM
              </div>
              <div
                style={{
                  fontSize: "0.6875rem",
                  color: "#A1A1AA",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Ops Console
              </div>
            </div>
          )}
        </Link>

        {!isCollapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            style={{
              minWidth: 44,
              minHeight: 44,
              background: "none",
              border: "none",
              color: "#A1A1AA",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            ◀
          </button>
        )}
      </div>

      <nav
        aria-label="Admin sections"
        className="admin-sidebar-nav"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {ADMIN_SECTIONS.filter((section) =>
          canViewAdminSection(section, role),
        ).map((section) => {
          const pages = section.pages.filter((page) =>
            canViewAdminPage(page, role),
          );
          const active = activeSection?.href === section.href;
          const expanded = expandedSection === section.href;
          const hasSubpages = pages.length > 1;
          const rowStyle: React.CSSProperties = {
            minHeight: 44,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: 12,
            padding: isCollapsed ? "8px 0" : "8px 12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            borderRadius: 8,
            fontSize: ".875rem",
            fontWeight: active ? 750 : 550,
            color: active ? "#FFFFFF" : "#D4D4D8",
            backgroundColor: active ? "#27272A" : "transparent",
            borderLeft: active ? "3px solid #F59E0B" : "3px solid transparent",
            textDecoration: "none",
          };
          const contents = (
            <>
              <span style={{ fontSize: "1.125rem" }} aria-hidden="true">
                {section.icon}
              </span>
              {!isCollapsed && (
                <>
                  <span style={{ flex: 1, textAlign: "left" }}>
                    {section.label}
                  </span>
                  {hasSubpages && (
                    <span
                      aria-hidden="true"
                      className={
                        expanded
                          ? "admin-nav-chevron admin-nav-chevron-open"
                          : "admin-nav-chevron"
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        focusable="false"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  )}
                </>
              )}
            </>
          );

          return (
            <div key={section.href} className="admin-nav-group">
              {hasSubpages && !isCollapsed ? (
                <button
                  type="button"
                  className="admin-nav-section-button"
                  style={rowStyle}
                  aria-expanded={expanded}
                  aria-controls={`admin-subpages-${section.href.replaceAll("/", "-") || "overview"}`}
                  onClick={() =>
                    setExpandedSection((previous) =>
                      previous === section.href ? null : section.href,
                    )
                  }
                >
                  {contents}
                </button>
              ) : (
                <Link
                  href={section.href}
                  onClick={onNavigate}
                  aria-current={!hasSubpages && active ? "page" : undefined}
                  prefetch={false}
                  title={isCollapsed ? section.label : undefined}
                  style={rowStyle}
                >
                  {contents}
                </Link>
              )}
              {hasSubpages && !isCollapsed && expanded && (
                <div
                  id={`admin-subpages-${section.href.replaceAll("/", "-") || "overview"}`}
                  className="admin-nav-subpages"
                >
                  {pages.map((page) => {
                    const selected =
                      pathname === page.href ||
                      (page.href !== "/" &&
                        pathname.startsWith(page.href + "/"));
                    return (
                      <Link
                        key={page.href}
                        href={page.href}
                        prefetch={false}
                        onClick={onNavigate}
                        aria-current={selected ? "page" : undefined}
                        className={
                          selected
                            ? "admin-nav-subpage admin-nav-subpage-current"
                            : "admin-nav-subpage"
                        }
                      >
                        {page.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid #27272A",
            backgroundColor: "#121212",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "#A1A1AA",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Active Work View
          </div>
          <div
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: role ? "#F59E0B" : "#A1A1AA",
              marginTop: "2px",
            }}
          >
            {role ? role.replaceAll("_", " ") : "Not authenticated"}
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#71717A",
              fontSize: "0.6875rem",
              lineHeight: 1.35,
            }}
          >
            Navigation context only; permissions remain tied to your account.
          </div>
        </div>
      )}
    </aside>
  );
}
