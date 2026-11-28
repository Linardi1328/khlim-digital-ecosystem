"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  buildUrlWithSource,
  getQueryCampaignSource,
  resolveCampaignSource,
} from "../../lib/campaign-source";
import {
  formatRegisteredBusinessName,
  getPublicBusinessDetails,
} from "../../lib/business-details";
import {
  CONTACT_EMAIL_BODY_MAX_LENGTH,
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_ENQUIRY_CATEGORIES,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_WHATSAPP_BODY_MAX_LENGTH,
  buildWhatsAppDirectUrl,
  buildWhatsAppEnquiryUrl,
  formatWhatsAppDisplayNumber,
  getConfiguredOfficialWhatsAppRaw,
  isValidContactEmail,
  normalizeOfficialWhatsAppNumber,
  sanitizeMultilineContactText,
  sanitizeSingleLineContactText,
  type ContactEnquiryCategory,
} from "../../lib/contact-channels";
import { useI18n } from "../../lib/i18n-context";
import { PublicFooter } from "../../components/layout/public-footer";
import { PublicHeader } from "../../components/layout/public-header";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button, getButtonStyles } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";

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
  const officialWhatsAppRaw = getConfiguredOfficialWhatsAppRaw();
  const normalizedWhatsApp = useMemo(
    () => normalizeOfficialWhatsAppNumber(officialWhatsAppRaw),
    [officialWhatsAppRaw],
  );
  const whatsappDirectUrl = useMemo(
    () => buildWhatsAppDirectUrl(officialWhatsAppRaw),
    [officialWhatsAppRaw],
  );
  const hasWhatsApp = Boolean(normalizedWhatsApp && whatsappDirectUrl);
  const hasEmail = isValidContactEmail(business.email);
  const hasAnyDirectChannel = hasWhatsApp || hasEmail;

  const [category, setCategory] = useState<ContactEnquiryCategory>(
    "academy_registration",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
    privacy?: string;
  }>({});
  const [launchedChannel, setLaunchedChannel] = useState<
    "whatsapp" | "email" | null
  >(null);

  const categoryOptions = useMemo(
    () =>
      CONTACT_ENQUIRY_CATEGORIES.map((value) => ({
        value,
        label: t(`contact.category.${value}`),
      })),
    [t],
  );

  const selectedCategoryLabel = t(`contact.category.${category}`);
  const cleanName = sanitizeSingleLineContactText(
    name,
    CONTACT_NAME_MAX_LENGTH,
  );
  const cleanEmail = sanitizeSingleLineContactText(
    email,
    CONTACT_EMAIL_MAX_LENGTH,
  );
  const cleanMessage = sanitizeMultilineContactText(
    message,
    CONTACT_MESSAGE_MAX_LENGTH,
  );

  const emailInputValid = !cleanEmail || isValidContactEmail(cleanEmail);

  const whatsappDraftText = useMemo(() => {
    if (!hasWhatsApp || !privacyConsent || !cleanName || !cleanMessage) {
      return "";
    }
    return sanitizeMultilineContactText(
      t("contact.whatsappMessage", {
        category: selectedCategoryLabel,
        name: cleanName,
        message: cleanMessage,
      }),
      CONTACT_WHATSAPP_BODY_MAX_LENGTH,
    );
  }, [
    hasWhatsApp,
    privacyConsent,
    cleanName,
    cleanMessage,
    selectedCategoryLabel,
    t,
  ]);

  const whatsappEnquiryUrl = useMemo(
    () =>
      buildWhatsAppEnquiryUrl({
        rawPhone: officialWhatsAppRaw,
        privacyAcknowledged: privacyConsent,
        messageText: whatsappDraftText,
      }),
    [officialWhatsAppRaw, privacyConsent, whatsappDraftText],
  );

  const emailSubject = useMemo(() => {
    if (!hasEmail || !privacyConsent || !cleanName || !cleanMessage) return "";
    return sanitizeSingleLineContactText(
      t("contact.emailSubject", {
        category: selectedCategoryLabel,
        name: cleanName,
      }),
      240,
    );
  }, [
    hasEmail,
    privacyConsent,
    cleanName,
    cleanMessage,
    selectedCategoryLabel,
    t,
  ]);

  const emailBody = useMemo(() => {
    if (!hasEmail || !privacyConsent || !cleanName || !cleanMessage) return "";
    return sanitizeMultilineContactText(
      t("contact.emailBody", {
        category: selectedCategoryLabel,
        name: cleanName,
        email: cleanEmail || t("contact.emailNotProvided"),
        message: cleanMessage,
      }),
      CONTACT_EMAIL_BODY_MAX_LENGTH,
    );
  }, [
    hasEmail,
    privacyConsent,
    cleanName,
    cleanEmail,
    cleanMessage,
    selectedCategoryLabel,
    t,
  ]);

  const emailEnquiryUrl = useMemo(() => {
    if (
      !hasEmail ||
      !privacyConsent ||
      !emailSubject ||
      !emailBody ||
      !emailInputValid
    ) {
      return null;
    }
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailBody);
    return `mailto:${business.email}?subject=${subject}&body=${body}`;
  }, [
    hasEmail,
    business.email,
    privacyConsent,
    emailSubject,
    emailBody,
    emailInputValid,
  ]);

  const validateComposer = (): boolean => {
    const nextErrors: {
      name?: string;
      email?: string;
      message?: string;
      privacy?: string;
    } = {};

    if (!cleanName) {
      nextErrors.name = t("contact.validation.nameRequired");
    }
    if (!emailInputValid) {
      nextErrors.email = t("contact.validation.emailInvalid");
    }
    if (!cleanMessage) {
      nextErrors.message = t("contact.validation.messageRequired");
    }
    if (!privacyConsent) {
      nextErrors.privacy = t("contact.validation.privacyRequired");
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openWhatsAppEnquiry = () => {
    if (!hasWhatsApp) return;
    if (!validateComposer() || !whatsappEnquiryUrl) return;
    setLaunchedChannel("whatsapp");
    window.open(whatsappEnquiryUrl, "_blank", "noopener,noreferrer");
  };

  const openEmailEnquiry = () => {
    if (!hasEmail) return;
    if (!validateComposer() || !emailEnquiryUrl) return;
    setLaunchedChannel("email");
    window.location.assign(emailEnquiryUrl);
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (hasWhatsApp) {
      openWhatsAppEnquiry();
    } else if (hasEmail) {
      openEmailEnquiry();
    }
  };

  const showDraftPreview = Boolean(
    privacyConsent &&
    cleanName &&
    cleanMessage &&
    emailInputValid &&
    (whatsappEnquiryUrl || emailEnquiryUrl),
  );

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader campaignSource={campaignSource} />
      <main className="contact-page-main">
        <header className="contact-page-header">
          <Badge variant="brand" size="md">
            {t("contact.badge")}
          </Badge>
          <h1>{t("contact.title")}</h1>
          <p>{t("contact.intro")}</p>
        </header>

        <div className="contact-sections-stack">
          {/* Direct Communication Channels: WhatsApp Primary, Email Secondary */}
          <section aria-labelledby="contact-channels-heading">
            <h2
              id="contact-channels-heading"
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#18181B",
                margin: "0 0 16px",
              }}
            >
              {t("contact.channelsTitle")}
            </h2>
            <div className="contact-channels-grid">
              {/* Primary Channel: Official WhatsApp */}
              <Card
                className="contact-channel-card contact-channel-card--primary"
                data-testid="contact-channel-whatsapp"
              >
                <CardContent>
                  <div className="contact-channel-card-header">
                    <Badge variant="brand" size="sm">
                      {t("contact.primaryChannelBadge")}
                    </Badge>
                  </div>
                  <h3 className="contact-channel-card-title">
                    {t("contact.whatsappChannelTitle")}
                  </h3>
                  <p className="contact-channel-card-desc">
                    {t("contact.whatsappChannelDesc")}
                  </p>
                  {hasWhatsApp && normalizedWhatsApp && whatsappDirectUrl ? (
                    <div className="contact-channel-card-body">
                      <div
                        className="contact-channel-value"
                        data-testid="contact-whatsapp-number"
                      >
                        {formatWhatsAppDisplayNumber(normalizedWhatsApp)}
                      </div>
                      <a
                        href={whatsappDirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="contact-whatsapp-direct-link"
                        style={{
                          ...getButtonStyles("primary", "sm"),
                          minHeight: 44,
                        }}
                      >
                        {t("contact.whatsappDirectLink")}
                      </a>
                    </div>
                  ) : (
                    <div
                      role="note"
                      className="contact-channel-notice"
                      style={{ marginTop: 12 }}
                    >
                      <strong
                        style={{
                          display: "block",
                          marginBottom: 4,
                          fontSize: "0.875rem",
                        }}
                      >
                        {t("contact.whatsappUnavailableTitle")}
                      </strong>
                      <span>{t("contact.whatsappUnavailableBody")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Secondary Channel: Official Email */}
              <Card
                className="contact-channel-card"
                data-testid="contact-channel-email"
              >
                <CardContent>
                  <div className="contact-channel-card-header">
                    <Badge variant="neutral" size="sm">
                      {t("contact.secondaryChannelBadge")}
                    </Badge>
                  </div>
                  <h3 className="contact-channel-card-title">
                    {t("contact.emailChannelTitle")}
                  </h3>
                  <p className="contact-channel-card-desc">
                    {t("contact.emailChannelDesc")}
                  </p>
                  {hasEmail ? (
                    <div className="contact-channel-card-body">
                      <a
                        href={`mailto:${business.email}`}
                        data-testid="contact-email-direct-link"
                        style={{
                          color: "#18181B",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          textDecoration: "underline",
                          wordBreak: "break-word",
                        }}
                      >
                        {business.email}
                      </a>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <Alert
                        variant="warning"
                        title={t("contact.emailUnavailableTitle")}
                      >
                        {t("contact.emailUnavailableBody")}
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Guided Enquiry Composer */}
          <Card data-testid="contact-enquiry-card">
            <CardContent>
              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "#18181B",
                  marginTop: 0,
                  marginBottom: 8,
                }}
              >
                {t("contact.enquiryTitle")}
              </h2>
              <p
                style={{
                  color: "#52525B",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                {t("contact.enquirySubtitle")}
              </p>

              {hasAnyDirectChannel ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div role="note" className="contact-info-note">
                      {t("contact.info")}
                    </div>
                    <div role="note" className="contact-channel-notice">
                      <strong
                        style={{
                          display: "block",
                          marginBottom: 4,
                          fontSize: "0.875rem",
                        }}
                      >
                        {t("contact.sensitiveWarningTitle")}
                      </strong>
                      <span id="contact-sensitive-warning">
                        {t("contact.sensitiveWarningBody")}
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleFormSubmit}
                    noValidate
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    <Select
                      id="contact-category"
                      label={t("contact.categoryLabel")}
                      value={category}
                      options={categoryOptions}
                      onChange={(event) => {
                        setCategory(
                          event.target.value as ContactEnquiryCategory,
                        );
                        setLaunchedChannel(null);
                      }}
                    />

                    <div className="contact-form-two-col">
                      <Input
                        id="contact-name"
                        label={t("contact.name")}
                        required
                        autoComplete="name"
                        maxLength={CONTACT_NAME_MAX_LENGTH}
                        placeholder={t("contact.namePlaceholder")}
                        value={name}
                        error={fieldErrors.name}
                        onChange={(event) => {
                          setName(event.target.value);
                          setLaunchedChannel(null);
                          if (fieldErrors.name) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              name: undefined,
                            }));
                          }
                        }}
                      />

                      <Input
                        id="contact-email"
                        label={t("contact.email")}
                        type="email"
                        autoComplete="email"
                        maxLength={CONTACT_EMAIL_MAX_LENGTH}
                        placeholder={t("contact.emailPlaceholder")}
                        value={email}
                        error={fieldErrors.email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setLaunchedChannel(null);
                          if (fieldErrors.email) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              email: undefined,
                            }));
                          }
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <label
                          htmlFor="contact-message"
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#27272A",
                          }}
                        >
                          {t("contact.message")}
                        </label>
                        <span
                          id="contact-message-count"
                          style={{
                            fontSize: "0.78rem",
                            color: "#71717A",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {t("contact.charCount", {
                            count: message.length,
                            max: CONTACT_MESSAGE_MAX_LENGTH,
                          })}
                        </span>
                      </div>
                      <textarea
                        id="contact-message"
                        required
                        rows={5}
                        maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                        placeholder={t("contact.messagePlaceholder")}
                        aria-invalid={Boolean(fieldErrors.message)}
                        aria-describedby={
                          [
                            "contact-message-count",
                            "contact-sensitive-warning",
                            fieldErrors.message
                              ? "contact-message-error"
                              : undefined,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        value={message}
                        onChange={(event) => {
                          setMessage(event.target.value);
                          setLaunchedChannel(null);
                          if (fieldErrors.message) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              message: undefined,
                            }));
                          }
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "12px 14px",
                          fontSize: "0.9375rem",
                          lineHeight: 1.55,
                          borderRadius: 8,
                          border: fieldErrors.message
                            ? "1px solid #EF4444"
                            : "1px solid #D4D4D8",
                          color: "#18181B",
                          backgroundColor: "#FFFFFF",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                      {fieldErrors.message ? (
                        <span
                          id="contact-message-error"
                          role="alert"
                          style={{
                            fontSize: "0.8125rem",
                            color: "#B91C1C",
                            fontWeight: 500,
                          }}
                        >
                          {fieldErrors.message}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: 16,
                        borderRadius: 10,
                        backgroundColor: "#FAFAFA",
                        border: fieldErrors.privacy
                          ? "1px solid #EF4444"
                          : "1px solid #E4E4E7",
                      }}
                    >
                      <Checkbox
                        id="contact-privacy-consent"
                        required
                        checked={privacyConsent}
                        error={fieldErrors.privacy}
                        onChange={(event) => {
                          setPrivacyConsent(event.target.checked);
                          setLaunchedChannel(null);
                          if (fieldErrors.privacy) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              privacy: undefined,
                            }));
                          }
                        }}
                        label={
                          <span>
                            {t("contact.privacyPrefix")}{" "}
                            <Link
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#B45309",
                                fontWeight: 700,
                                textDecoration: "underline",
                              }}
                            >
                              {t("contact.privacyPolicyLink")}
                            </Link>{" "}
                            {t("contact.privacySuffix")}
                          </span>
                        }
                      />
                      {!privacyConsent ? (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8125rem",
                            color: "#52525B",
                            lineHeight: 1.5,
                          }}
                        >
                          {t("contact.privacyRequiredHint")}
                        </p>
                      ) : null}
                    </div>

                    {showDraftPreview ? (
                      <div
                        data-testid="contact-generated-preview"
                        style={{
                          padding: 16,
                          borderRadius: 10,
                          border: "1px solid #FDE68A",
                          backgroundColor: "#FFFBEB",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            color: "#78350F",
                            marginBottom: 4,
                          }}
                        >
                          {t("contact.previewTitle")}
                        </div>
                        <p
                          style={{
                            margin: "0 0 10px",
                            fontSize: "0.8125rem",
                            color: "#92400E",
                          }}
                        >
                          {t("contact.previewNote")}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {hasWhatsApp && whatsappDraftText ? (
                            <div>
                              {hasEmail ? (
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: "#78350F",
                                    marginBottom: 4,
                                  }}
                                >
                                  {t("contact.whatsappChannelTitle")}
                                </div>
                              ) : null}
                              <pre
                                data-testid="contact-generated-preview-text"
                                style={{
                                  margin: 0,
                                  padding: 12,
                                  borderRadius: 8,
                                  backgroundColor: "#FFFFFF",
                                  border: "1px solid #FDE68A",
                                  color: "#18181B",
                                  fontSize: "0.84rem",
                                  lineHeight: 1.55,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  fontFamily: "inherit",
                                }}
                              >
                                {whatsappDraftText}
                              </pre>
                            </div>
                          ) : null}
                          {hasEmail && emailBody ? (
                            <div>
                              {hasWhatsApp ? (
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: "#78350F",
                                    marginBottom: 4,
                                  }}
                                >
                                  {t("contact.emailChannelTitle")}
                                </div>
                              ) : null}
                              <pre
                                data-testid={
                                  hasWhatsApp
                                    ? "contact-generated-email-preview-text"
                                    : "contact-generated-preview-text"
                                }
                                style={{
                                  margin: 0,
                                  padding: 12,
                                  borderRadius: 8,
                                  backgroundColor: "#FFFFFF",
                                  border: "1px solid #FDE68A",
                                  color: "#18181B",
                                  fontSize: "0.84rem",
                                  lineHeight: 1.55,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  fontFamily: "inherit",
                                }}
                              >
                                {emailBody}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="contact-actions-row">
                      {hasWhatsApp ? (
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          data-testid="contact-whatsapp-submit"
                          disabled={!privacyConsent}
                          style={{ minHeight: 48 }}
                        >
                          {t("contact.openWhatsApp")}
                        </Button>
                      ) : null}

                      {hasEmail ? (
                        <Button
                          type={hasWhatsApp ? "button" : "submit"}
                          variant={hasWhatsApp ? "outline" : "primary"}
                          size="lg"
                          data-testid="contact-email-submit"
                          disabled={!privacyConsent}
                          onClick={hasWhatsApp ? openEmailEnquiry : undefined}
                          style={{ minHeight: 48 }}
                        >
                          {t("contact.openEmail")}
                        </Button>
                      ) : null}
                    </div>

                    {showDraftPreview ? (
                      <div
                        className="contact-direct-links-row"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 16,
                          fontSize: "0.85rem",
                        }}
                      >
                        {whatsappEnquiryUrl ? (
                          <a
                            href={whatsappEnquiryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="contact-whatsapp-link"
                            onClick={() => setLaunchedChannel("whatsapp")}
                            style={{
                              color: "#B45309",
                              fontWeight: 700,
                              textDecoration: "underline",
                            }}
                          >
                            {t("contact.openWhatsApp")} ↗
                          </a>
                        ) : null}
                        {emailEnquiryUrl ? (
                          <a
                            href={emailEnquiryUrl}
                            data-testid="contact-email-link"
                            onClick={() => setLaunchedChannel("email")}
                            style={{
                              color: "#27272A",
                              fontWeight: 600,
                              textDecoration: "underline",
                            }}
                          >
                            {t("contact.openEmail")}
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {launchedChannel ? (
                      <div
                        role="status"
                        className="contact-info-note"
                        data-testid="contact-launch-status"
                      >
                        {launchedChannel === "whatsapp"
                          ? t("contact.whatsappPromptedStatus")
                          : t("contact.emailPromptedStatus")}
                      </div>
                    ) : null}
                  </form>
                </>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div role="note" className="contact-channel-notice">
                    <strong
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontSize: "0.875rem",
                      }}
                    >
                      {t("contact.noChannelsTitle")}
                    </strong>
                    <span>{t("contact.noChannelsBody")}</span>
                  </div>
                  <div>
                    <Link
                      href={buildUrlWithSource("/interest", campaignSource)}
                      style={{
                        ...getButtonStyles("primary", "md"),
                        minHeight: 44,
                      }}
                    >
                      {t("contact.registerInterestCta")}
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Official Academy Business Disclosures */}
          <Card>
            <CardContent>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
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
                  {formatRegisteredBusinessName(business)}
                </div>
                {business.businessAddress ? (
                  <div>{business.businessAddress}</div>
                ) : null}
                {hasWhatsApp && normalizedWhatsApp && whatsappDirectUrl ? (
                  <div>
                    {t("contact.whatsappNumberLabel")}:{" "}
                    <a
                      href={whatsappDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#B45309",
                        fontWeight: 600,
                        textDecoration: "underline",
                      }}
                    >
                      {formatWhatsAppDisplayNumber(normalizedWhatsApp)}
                    </a>
                  </div>
                ) : null}
                {hasEmail && business.email ? (
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
              {business.phone ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: "0.8125rem",
                    color: "#71717A",
                    lineHeight: 1.5,
                  }}
                >
                  {t("contact.detailsNote")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter campaignSource={campaignSource} />
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
