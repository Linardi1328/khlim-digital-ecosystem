"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import { getPublicBusinessDetails } from "../../lib/business-details";
import { useI18n } from "../../lib/i18n-context";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";

function ContactContent() {
  const { t } = useI18n();
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

  const business = getPublicBusinessDetails();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const openEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!business.email || !privacyConsent) return;
    const subject = encodeURIComponent(t("contact.emailSubject", { name }));
    const body = encodeURIComponent(
      t("contact.emailBody", { name, email, message }),
    );
    window.location.assign(
      `mailto:${business.email}?subject=${subject}&body=${body}`,
    );
  };

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              color: "#18181B",
              margin: "0 0 12px",
            }}
          >
            {t("contact.title")}
          </h1>
          <p
            style={{
              fontSize: "1.125rem",
              color: "#71717A",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {t("contact.intro")}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <Card>
            <CardContent>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#18181B",
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                {t("contact.detailsTitle")}
              </h2>
              <address
                style={{
                  fontStyle: "normal",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: "0.9375rem",
                  color: "#3F3F46",
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#18181B",
                    fontSize: "1rem",
                  }}
                >
                  {business.legalName}
                </div>
                {business.registrationNumber ? (
                  <div>
                    {t("compliance.footer.companyNumberLabel")}:{" "}
                    <span>{business.registrationNumber}</span>
                  </div>
                ) : null}
                {business.businessAddress ? (
                  <div>{business.businessAddress}</div>
                ) : null}
                {business.email ? (
                  <div>
                    {t("compliance.footer.emailLabel")}:{" "}
                    <a
                      href={`mailto:${business.email}`}
                      style={{
                        color: "#2563EB",
                        textDecoration: "underline",
                      }}
                    >
                      {business.email}
                    </a>
                  </div>
                ) : null}
                {business.phone ? (
                  <div>
                    {t("compliance.footer.telephoneLabel")}:{" "}
                    <a
                      href={`tel:${business.phone}`}
                      style={{
                        color: "#2563EB",
                        textDecoration: "underline",
                      }}
                    >
                      {business.phone}
                    </a>
                  </div>
                ) : null}
              </address>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#18181B",
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                {t("contact.enquiryTitle")}
              </h2>
              {business.email ? (
                <>
                  <Alert variant="info">{t("contact.info")}</Alert>
                  <form
                    onSubmit={openEmail}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      marginTop: 16,
                    }}
                  >
                    <Input
                      label={t("contact.name")}
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                    <Input
                      label={t("contact.email")}
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <div>
                      <label htmlFor="contact-message">
                        {t("contact.message")}
                      </label>
                      <textarea
                        id="contact-message"
                        required
                        rows={5}
                        maxLength={5000}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        style={{
                          display: "block",
                          width: "100%",
                          boxSizing: "border-box",
                          marginTop: 6,
                          padding: 12,
                        }}
                      />
                    </div>
                    <Checkbox
                      id="contact-privacy-consent"
                      required
                      checked={privacyConsent}
                      onChange={(event) =>
                        setPrivacyConsent(event.target.checked)
                      }
                      label={
                        <span data-i18n-static="bilingual">
                          I have read the{" "}
                          <Link href="/privacy" target="_blank">
                            Privacy Policy
                          </Link>{" "}
                          and consent to KHLIM using my name, email and message
                          to respond to this enquiry. I understand this does not
                          subscribe me to marketing. / Saya telah membaca{" "}
                          <Link href="/privacy" target="_blank">
                            Dasar Privasi
                          </Link>{" "}
                          dan bersetuju KHLIM menggunakan nama, e-mel dan mesej
                          saya untuk menjawab pertanyaan ini. Saya faham ini
                          tidak mendaftarkan saya untuk pemasaran.
                        </span>
                      }
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!privacyConsent}
                    >
                      {t("contact.openEmail")}
                    </Button>
                  </form>
                </>
              ) : (
                <Alert
                  variant="warning"
                  title={t("contact.emailUnavailableTitle")}
                >
                  {t("contact.emailUnavailableBody")}
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" style={{ minHeight: "100vh" }} />}
    >
      <ContactContent />
    </Suspense>
  );
}
