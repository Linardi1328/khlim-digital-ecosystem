"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AcademyRegistrationFlow } from "../../../components/academy/academy-registration-flow";
import { PublicFooter } from "../../../components/layout/public-footer";
import { PublicHeader } from "../../../components/layout/public-header";
import {
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../../lib/campaign-source";
import { useI18n } from "../../../lib/i18n-context";

function AcademyRegisterContent() {
  const searchParams = useSearchParams();
  const queryCampaign = useMemo(
    () => getQueryCampaignSource(searchParams),
    [searchParams],
  );
  const [storedCampaign, setStoredCampaign] = useState<string | null>(null);

  useEffect(() => {
    setStoredCampaign(resolveCampaignSource(searchParams));
  }, [searchParams]);

  const campaignSource = queryCampaign ?? storedCampaign;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <AcademyRegistrationFlow />
      <PublicFooter campaignSource={campaignSource} />
    </div>
  );
}

function AcademyRegisterFallback() {
  const { t } = useI18n();
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main
        aria-busy="true"
        aria-live="polite"
        style={{ flex: 1, padding: 48, textAlign: "center" }}
      >
        <span className="sr-only">{t("academyReg.page.loading")}</span>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function AcademyRegisterPage() {
  return (
    <Suspense fallback={<AcademyRegisterFallback />}>
      <AcademyRegisterContent />
    </Suspense>
  );
}
