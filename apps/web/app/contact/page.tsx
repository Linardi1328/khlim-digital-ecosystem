"use client";

import React, { useState } from "react";
import { useI18n } from "../../lib/i18n-context";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function ContactPage() {
  const { t } = useI18n();
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const openEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactEmail) return;
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
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <Input
                    label={t("contact.email")}
                    type="email"
                    required
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
                  <Button type="submit" variant="primary">
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
