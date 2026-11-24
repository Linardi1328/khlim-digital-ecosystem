"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { ComingSoonPanel } from "../../components/layout/coming-soon-panel";
import { isFeatureAvailable } from "../../lib/feature-availability";

export default function PortalIndexPage() {
  const router = useRouter();
  const portalAvailable = isFeatureAvailable("parentPortal");

  useEffect(() => {
    if (portalAvailable) {
      router.replace("/portal/dashboard");
    }
  }, [portalAvailable, router]);

  if (!portalAvailable) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <PublicHeader />
        <ComingSoonPanel feature="parentPortal" />
        <PublicFooter />
      </div>
    );
  }

  return null;
}
