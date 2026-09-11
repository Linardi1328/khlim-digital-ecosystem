"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "../../lib/i18n-context";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";

export default function ContactPage() {
  const { t } = useI18n();
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const openEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactEmail || !privacyConsent) return;
    const subject = encodeURIComponent(t("contact.emailSubject", { name }));
    const body = encodeURIComponent(
      t("contact.emailBody", { name, email, message }),
    );
    window.location.assign(
      `mailto:${contactEmail}?subject=${subject}&body=${body}`,
    );
  };

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
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
        <h1>{t("contact.title")}</h1>
        <Card>
          <CardContent>
            {contactEmail ? (
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
                    onChange={(event) => setPrivacyConsent(event.target.checked)}
                    label={
                      <span>
                        I have read the <Link href="/privacy" target="_blank">Privacy Policy</Link> and consent to KHLIM using my name, email and message to respond to this enquiry. I understand this does not subscribe me to marketing. / Saya telah membaca <Link href="/privacy" target="_blank">Dasar Privasi</Link> dan bersetuju KHLIM menggunakan nama, e-mel dan mesej saya untuk menjawab pertanyaan ini. Saya faham ini tidak mendaftarkan saya untuk pemasaran.
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
              <Alert variant="warning" title={t("contact.notConfiguredTitle")}>
                {t("contact.notConfiguredBody")}
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
