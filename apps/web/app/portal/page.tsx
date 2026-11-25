"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { ComingSoonPanel } from "../../components/layout/coming-soon-panel";
import { resolveCampaignSource } from "../../lib/campaign-source";
import { isFeatureAvailable } from "../../lib/feature-availability";

export default function PortalIndexPage() {
  const router = useRouter();
  const portalAvailable = isFeatureAvailable("parentPortal");
  const [campaignSource, setCampaignSource] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCampaignSource(
        resolveCampaignSource(new URLSearchParams(window.location.search)),
      );
    }
  }, []);

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
        <PublicHeader campaignSource={campaignSource} />
        <ComingSoonPanel
          feature="parentPortal"
          campaignSource={campaignSource}
        />
        <PublicFooter campaignSource={campaignSource} />
      </div>
    );
  }

  return null;
}
