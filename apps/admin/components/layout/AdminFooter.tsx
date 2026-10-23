import React from "react";

export function AdminFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      className={`admin-footer${compact ? " admin-footer--access" : ""}`}
      aria-label="KHLIM Admin footer"
    >
      <div className="admin-footer-inner">
        <div className="admin-footer-brand">
          <img src="/khs-academy-logo.webp" alt="" width={30} height={36} />
          <div className="admin-footer-brand-text">
            <strong>KHLIM Sports Academy</strong>
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
