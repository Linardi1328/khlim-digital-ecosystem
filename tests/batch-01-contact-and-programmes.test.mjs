import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  CONTACT_EMAIL_BODY_MAX_LENGTH,
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_ENQUIRY_CATEGORIES,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  buildEmailEnquiryUrl,
  buildWhatsAppDirectUrl,
  buildWhatsAppEnquiryUrl,
  encodeMailtoRecipient,
  formatWhatsAppDisplayNumber,
  getConfiguredOfficialWhatsAppRaw,
  isValidContactEmail,
  normalizeOfficialWhatsAppNumber,
  sanitizeMultilineContactText,
  sanitizeSingleLineContactText,
} from "../apps/web/lib/contact-channels.ts";
import { buildProgrammesRedirectTarget } from "../apps/web/lib/programmes-redirect.ts";
import { publicPageMessages } from "../packages/i18n/src/messages/public-pages.ts";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("WhatsApp normalization validates Malaysian mobile and international E.164 numbers and rejects landlines or invalid input", () => {
  assert.equal(
    normalizeOfficialWhatsAppNumber("+60 12-345 6789"),
    "60123456789",
  );
  assert.equal(normalizeOfficialWhatsAppNumber("012-345 6789"), "60123456789");
  assert.equal(
    normalizeOfficialWhatsAppNumber("011-1234 5678"),
    "601112345678",
  );
  assert.equal(
    normalizeOfficialWhatsAppNumber("0060 12-345 6789"),
    "60123456789",
  );
  assert.equal(normalizeOfficialWhatsAppNumber("+65 9123 4567"), "6591234567");

  assert.equal(formatWhatsAppDisplayNumber("60123456789"), "+60 12-345 6789");
  assert.equal(formatWhatsAppDisplayNumber("601112345678"), "+60 11-1234 5678");
  assert.equal(formatWhatsAppDisplayNumber("6591234567"), "+6591234567");

  // Rejects empty, Malaysian landlines without explicit E.164, letters, misplaced plus, and out-of-range lengths
  for (const invalid of [
    "",
    "   ",
    null,
    undefined,
    "03-8941 2000",
    "04-222 3333",
    "+0123456789",
    "60+123456789",
    "wa.me/60123456789",
    "012-345-ABCD",
    "12345",
    "+60123456789012345",
  ]) {
    assert.equal(
      normalizeOfficialWhatsAppNumber(invalid),
      null,
      `Expected ${JSON.stringify(invalid)} to be rejected`,
    );
  }
});

test("official WhatsApp configuration never falls back to NEXT_PUBLIC_BUSINESS_PHONE", () => {
  const prevWa = process.env.NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER;
  const prevPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE;
  try {
    delete process.env.NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER;
    process.env.NEXT_PUBLIC_BUSINESS_PHONE = "+60 3-8941 2000";

    assert.equal(getConfiguredOfficialWhatsAppRaw(), "");
    assert.equal(
      buildWhatsAppDirectUrl(getConfiguredOfficialWhatsAppRaw()),
      null,
    );

    process.env.NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER = "+60 12-345 6789";
    assert.equal(getConfiguredOfficialWhatsAppRaw(), "+60 12-345 6789");
    assert.equal(
      buildWhatsAppDirectUrl(getConfiguredOfficialWhatsAppRaw()),
      "https://wa.me/60123456789",
    );
  } finally {
    if (prevWa === undefined)
      delete process.env.NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER;
    else process.env.NEXT_PUBLIC_KHLIM_WHATSAPP_NUMBER = prevWa;
    if (prevPhone === undefined) delete process.env.NEXT_PUBLIC_BUSINESS_PHONE;
    else process.env.NEXT_PUBLIC_BUSINESS_PHONE = prevPhone;
  }
});

test("WhatsApp and email enquiry URL builders require privacy acknowledgement and encode special characters safely", () => {
  assert.equal(
    buildWhatsAppEnquiryUrl({
      rawPhone: "+60 12-345 6789",
      privacyAcknowledged: false,
      messageText: "Hello KHLIM",
    }),
    null,
  );
  assert.equal(
    buildEmailEnquiryUrl({
      recipientEmail: "enquiry@khlim.test",
      privacyAcknowledged: false,
      subject: "Subject",
      body: "Body",
    }),
    null,
  );

  const waUrl = buildWhatsAppEnquiryUrl({
    rawPhone: "012-345 6789",
    privacyAcknowledged: true,
    messageText:
      "Category: Membership & fees?\nName: Wei Ming\nMsg: 100% ready #U12",
  });
  assert.ok(waUrl?.startsWith("https://wa.me/60123456789?text="));
  const decodedWaText = decodeURIComponent(waUrl.split("?text=")[1]);
  assert.equal(
    decodedWaText,
    "Category: Membership & fees?\nName: Wei Ming\nMsg: 100% ready #U12",
  );

  const mailUrl = buildEmailEnquiryUrl({
    recipientEmail: "enquiry@khlim.test",
    privacyAcknowledged: true,
    subject: "[Membership & fees] Enquiry from Amina?",
    body: "Line 1\nLine 2 & #3",
  });
  assert.ok(mailUrl?.startsWith("mailto:enquiry@khlim.test?subject="));
  assert.ok(!mailUrl.includes("& #3"));
  assert.ok(mailUrl.includes("%26%20%233"));

  // Email validation rejects CR/LF header injection while permitting valid RFC 5322 local-part chars
  // that are percent-encoded per RFC 6068 when constructing mailto: URIs.
  assert.equal(isValidContactEmail("enquiry@khlim.test"), true);
  assert.equal(isValidContactEmail("alex&family@example.com"), true);
  assert.equal(isValidContactEmail("academy?team@example.com"), true);
  assert.equal(
    isValidContactEmail("enquiry@khlim.test\r\nBcc:evil@x.test"),
    false,
  );
  assert.equal(isValidContactEmail("not-an-email"), false);
  assert.equal(isValidContactEmail("alex@example..com"), false);
  assert.equal(isValidContactEmail("alex@.example.com"), false);
  assert.equal(isValidContactEmail("alex@example.com."), false);
  assert.equal(isValidContactEmail("alex@-example.com"), false);
  assert.equal(
    encodeMailtoRecipient("academy?team@example.com"),
    "academy%3Fteam@example.com",
  );
  assert.equal(
    encodeMailtoRecipient("alex&family@example.com"),
    "alex%26family@example.com",
  );
  const encodedRecipientUrl = buildEmailEnquiryUrl({
    recipientEmail: "alex&family@example.com",
    privacyAcknowledged: true,
    subject: "Enquiry",
    body: "Hello",
  });
  assert.ok(
    encodedRecipientUrl?.startsWith(
      "mailto:alex%26family@example.com?subject=",
    ),
  );
});

test("contact sanitizers keep surrogate pairs intact and preserve full max-length email bodies", () => {
  assert.equal(CONTACT_NAME_MAX_LENGTH, 100);
  assert.equal(CONTACT_EMAIL_MAX_LENGTH, 254);
  assert.equal(CONTACT_MESSAGE_MAX_LENGTH, 1000);
  assert.ok(CONTACT_EMAIL_BODY_MAX_LENGTH >= 1600);

  assert.equal(
    sanitizeSingleLineContactText("  Alice\r\n\tTan\u0000  ", 50),
    "Alice Tan",
  );
  assert.equal(
    sanitizeSingleLineContactText("a".repeat(200), CONTACT_NAME_MAX_LENGTH)
      .length,
    100,
  );
  assert.equal(
    sanitizeMultilineContactText("Line 1\r\n\r\n\r\nLine 2\u0007", 200),
    "Line 1\n\nLine 2",
  );
  assert.equal(
    sanitizeMultilineContactText("b".repeat(1500), CONTACT_MESSAGE_MAX_LENGTH)
      .length,
    1000,
  );

  // Surrogate-pair boundary safety: 999 ASCII chars + 2-code-unit emoji must not leave a lone surrogate
  const boundaryInput = `${"x".repeat(999)}🏀`;
  const bounded = sanitizeMultilineContactText(
    boundaryInput,
    CONTACT_MESSAGE_MAX_LENGTH,
  );
  assert.equal(bounded.length, 999);
  assert.doesNotThrow(() => encodeURIComponent(bounded));

  // Lone surrogates are stripped cleanly before URL encoding
  const loneSurrogate = `Hello \uD83D world \uDC00 end`;
  const cleanedLone = sanitizeSingleLineContactText(loneSurrogate, 100);
  assert.doesNotThrow(() => encodeURIComponent(cleanedLone));

  // Full max-length name + email + message + longest category preserves entire message
  const maxName = "N".repeat(CONTACT_NAME_MAX_LENGTH);
  const maxEmail = `${"e".repeat(60)}@${"d".repeat(180)}.example.com`;
  const maxMessage = `${"m".repeat(990)}END_MARKER`;
  const fullBody = `Category: Training programmes and schedules\nName: ${maxName}\nEmail: ${maxEmail}\n\n${maxMessage}`;
  const fullMailUrl = buildEmailEnquiryUrl({
    recipientEmail: "enquiry@khlim.test",
    privacyAcknowledged: true,
    subject: `[Training programmes and schedules] KHLIM Academy enquiry from ${maxName}`,
    body: fullBody,
  });
  assert.ok(fullMailUrl);
  const decodedBody = decodeURIComponent(fullMailUrl.split("&body=")[1]);
  assert.ok(decodedBody.endsWith("END_MARKER"));
  assert.equal(decodedBody, fullBody);
});

test("all 6 contact categories and new contact/programmes keys exist across all 5 locales", () => {
  assert.deepEqual(
    [...CONTACT_ENQUIRY_CATEGORIES],
    [
      "academy_registration",
      "training_programmes_schedules",
      "membership_fees",
      "tournaments_events",
      "partnerships_sponsorships",
      "general_enquiries",
    ],
  );

  const locales = ["en", "ms", "zh-Hans", "zh-Hant", "hi"];
  const requiredKeys = [
    ...CONTACT_ENQUIRY_CATEGORIES.map((c) => `contact.category.${c}`),
    "contact.whatsappChannelTitle",
    "contact.whatsappUnavailableTitle",
    "contact.whatsappUnavailableBody",
    "contact.sensitiveWarningTitle",
    "contact.sensitiveWarningBody",
    "contact.openWhatsApp",
    "contact.openEmail",
    "contact.whatsappPromptedStatus",
    "contact.emailPromptedStatus",
    "contact.privacyPolicyLink",
    "programmes.showingCount",
    "programmes.showingCountForLevel",
    "programmes.outageHelperNote",
    "programmes.emptyHelperNote",
    "programmes.pathway.eyebrow",
    "programmes.pathway.disclaimer",
    "programmes.pathway.learnMoreAcademy",
    "programmes.pathway.contactUs",
  ];

  for (const locale of locales) {
    const catalogue = publicPageMessages[locale];
    assert.ok(catalogue, `Missing locale ${locale}`);
    for (const key of requiredKeys) {
      assert.equal(
        typeof catalogue[key],
        "string",
        `Missing ${key} in locale ${locale}`,
      );
      assert.ok(
        catalogue[key].trim().length > 0,
        `Empty ${key} in locale ${locale}`,
      );
    }
  }
});

test("Programmes redirect helper targets /academy#programmes and preserves campaign and query parameters", () => {
  assert.equal(buildProgrammesRedirectTarget({}), "/academy#programmes");
  assert.equal(
    buildProgrammesRedirectTarget({ source: "3x3-oct24" }),
    "/academy?source=3x3-oct24#programmes",
  );
  assert.equal(
    buildProgrammesRedirectTarget({
      utm_source: "instagram_story",
      utm_medium: "social",
      ref: "fb_group",
    }),
    "/academy?utm_source=instagram_story&utm_medium=social&ref=fb_group#programmes",
  );
  assert.equal(
    buildProgrammesRedirectTarget({
      campaign: ["spring_2027", "u12"],
      ignored: undefined,
    }),
    "/academy?campaign=spring_2027&campaign=u12#programmes",
  );
});

test("Academy consolidates resilient programme catalogue without duplicating U9/U12/U15 and removes standalone Programmes nav", async () => {
  const academyPage = await read("apps/web/app/academy/page.tsx");
  const catalogueSection = await read(
    "apps/web/components/academy/programme-catalogue-section.tsx",
  );
  const buttonComponent = await read("apps/web/components/ui/button.tsx");
  const programmesRedirectPage = await read("apps/web/app/programmes/page.tsx");
  const header = await read("apps/web/components/layout/public-header.tsx");
  const footer = await read("apps/web/components/layout/public-footer.tsx");

  // /programmes redirects to /academy#programmes preserving searchParams
  assert.match(programmesRedirectPage, /buildProgrammesRedirectTarget/);
  assert.match(programmesRedirectPage, /redirect\(/);

  // Standalone Programmes nav item is removed from desktop/mobile header and footer
  assert.doesNotMatch(header, /t\("nav\.programmes"\)/);
  assert.doesNotMatch(header, /buildUrlWithSource\("\/programmes"/);
  assert.doesNotMatch(footer, /t\("nav\.programmes"\)/);
  assert.doesNotMatch(footer, /buildUrlWithSource\("\/programmes"/);
  assert.match(
    footer,
    /buildUrlWithSource\("\/academy#programmes", campaignSource\)/,
  );

  // Integrated catalogue retains all 4 distinct states and zero duplicated U9/U12/U15 cards
  assert.match(catalogueSection, /id="programmes"/);
  assert.match(catalogueSection, /data-testid="programmes-live-catalogue"/);
  assert.match(catalogueSection, /data-testid="programmes-state-loading"/);
  assert.match(catalogueSection, /data-testid="programmes-state-unavailable"/);
  assert.match(catalogueSection, /data-testid="programmes-state-empty"/);
  assert.match(catalogueSection, /data-testid="programmes-state-available"/);
  assert.match(catalogueSection, /aria-pressed=\{level === "ALL"\}/);
  assert.match(catalogueSection, /aria-pressed=\{level === item\}/);
  assert.match(catalogueSection, /t\("programmes\.showingCountForLevel"/);
  assert.match(buttonComponent, /ButtonHTMLAttributes<HTMLButtonElement>/);
  assert.match(buttonComponent, /\{\.\.\.props\}/);
  assert.doesNotMatch(catalogueSection, /academy\.pathway\.u9/);
  assert.doesNotMatch(catalogueSection, /academy\.pathway\.u12/);
  assert.doesNotMatch(catalogueSection, /academy\.pathway\.u15/);
  assert.match(
    catalogueSection,
    /buildUrlWithSource\(\s*"\/interest",\s*campaignSource,?\s*\)/,
  );

  // Academy embeds ProgrammeCatalogueSection alongside single canonical U9/U12/U15 pathway
  assert.match(
    academyPage,
    /<ProgrammeCatalogueSection campaignSource=\{campaignSource\} \/>/,
  );
  assert.match(academyPage, /data-testid="academy-pathway-overview"/);
  assert.match(academyPage, /t\("programmes\.pathway\.disclaimer"\)/);
  assert.equal(
    (academyPage.match(/academy\.pathway\.u9\.title/g) ?? []).length,
    1,
  );
  assert.equal(
    (academyPage.match(/academy\.pathway\.u12\.title/g) ?? []).length,
    1,
  );
  assert.equal(
    (academyPage.match(/academy\.pathway\.u15\.title/g) ?? []).length,
    1,
  );
});
