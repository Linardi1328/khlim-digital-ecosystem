"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../../lib/auth-context";
import {
  canViewAdminPage,
  getAdminSectionForPath,
  matchesAdminPath,
} from "./admin-sections";

/**
 * A shared workspace frame for related Admin pages. Each tab retains its
 * existing route and independently loads data only when visited.
 */
export function AdminSectionNavigation() {
  const pathname = usePathname();
  const { role } = useAdminAuth();
  const current = getAdminSectionForPath(pathname);
  if (!current) return null;

  const { section, page } = current;
  const availablePages = section.pages.filter((candidate) =>
    canViewAdminPage(candidate, role),
  );

  // Navigation is only a convenience; the API is the access authority.
  // Do not reveal page instructions or navigation for a disallowed work view.
  if (!canViewAdminPage(page, role)) return null;

  return (
    <section className="admin-section-frame" aria-label={section.label + " workspace"}>
      <header className="admin-section-heading">
        <div className="admin-section-symbol" aria-hidden="true">
          {section.icon}
        </div>
        <div className="admin-section-copy">
          <p className="admin-section-eyebrow">KHLIM OPERATIONS / WORKSPACE</p>
          <h2 className="admin-section-name">{section.label}</h2>
          <p className="admin-section-description">{section.description}</p>
        </div>
      </header>

      {availablePages.length > 1 && (
        <nav className="admin-section-tabs" aria-label={section.label + " pages"}>
          {availablePages.map((candidate) => {
            const selected = matchesAdminPath(pathname, candidate.href) &&
              page.href === candidate.href;
            return (
              <Link
                key={candidate.href}
                href={candidate.href}
                prefetch={false}
                aria-current={selected ? "page" : undefined}
                className={
                  "admin-section-tab" +
                  (selected ? " admin-section-tab-active" : "")
                }
              >
                {candidate.label}
              </Link>
            );
          })}
        </nav>
      )}

      <details className="admin-section-help">
        <summary aria-label={"How to use " + page.label}>
          <span aria-hidden="true">ⓘ</span> How to use {page.label}
        </summary>
        <div className="admin-section-help-content">
          <div>
            <strong>Purpose</strong>
            <p>{page.purpose}</p>
          </div>
          <div>
            <strong>Typical workflow</strong>
            <p>{page.steps}</p>
          </div>
          <div>
            <strong>Important</strong>
            <p>{page.caution}</p>
          </div>
        </div>
      </details>
    </section>
  );
}
