import React from "react";

export function AdminFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      className={`admin-footer${compact ? " admin-footer--access" : ""}`}
      aria-label="KHLIM Admin footer"
      role="contentinfo"
    >
      <div className="admin-footer-inner">
        <div className="admin-footer-brand">
          <div className="admin-footer-logo-frame">
            <img
              src="/brand/khs-academy-wordmark.png"
              alt="KHS Academy official wordmark"
              width={100}
              height={61}
            />
          </div>
          <div className="admin-footer-brand-text">
            <strong>KHS Academy</strong>
            <span>Operations Console</span>
          </div>
        </div>
        <p>
          © {new Date().getFullYear()} KHLIM Basketball Sdn. Bhd. · Authorised
          staff only
        </p>
      </div>
    </footer>
  );
}
