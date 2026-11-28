import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_ENQUIRY_CATEGORIES,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  buildEmailEnquiryUrl,
  buildWhatsAppDirectUrl,
  buildWhatsAppEnquiryUrl,
  formatWhatsAppDisplayNumber,
  getConfiguredOfficialWhatsAppRaw,
  isValidContactEmail,
  normalizeOfficialWhatsAppNumber,
  sanitizeMultilineContactText,
  sanitizeSingleLineContactText,
} from "../apps/web/lib/contact-channels.ts";
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

  // Email validation rejects header injection
  assert.equal(isValidContactEmail("enquiry@khlim.test"), true);
  assert.equal(
    isValidContactEmail("enquiry@khlim.test\r\nBcc:evil@x.test"),
    false,
  );
  assert.equal(isValidContactEmail("not-an-email"), false);
});

test("contact input sanitizers strip control characters and enforce length bounds", () => {
  assert.equal(CONTACT_NAME_MAX_LENGTH, 100);
  assert.equal(CONTACT_EMAIL_MAX_LENGTH, 254);
  assert.equal(CONTACT_MESSAGE_MAX_LENGTH, 1000);

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

test("programmes page keeps API catalogue separate from approved informational academy pathway", async () => {
  const programmesPage = await read("apps/web/app/programmes/page.tsx");
  assert.match(programmesPage, /data-testid="programmes-live-catalogue"/);
  assert.match(programmesPage, /data-testid="programmes-state-loading"/);
  assert.match(programmesPage, /data-testid="programmes-state-unavailable"/);
  assert.match(programmesPage, /data-testid="programmes-state-empty"/);
  assert.match(programmesPage, /data-testid="programmes-state-available"/);
  assert.match(programmesPage, /data-testid="programmes-pathway-overview"/);
  assert.match(programmesPage, /t\("programmes\.pathway\.disclaimer"\)/);
  assert.match(programmesPage, /t\("academy\.pathway\.u9\.title"\)/);
  assert.match(programmesPage, /t\("academy\.pathway\.u12\.title"\)/);
  assert.match(programmesPage, /t\("academy\.pathway\.u15\.title"\)/);
  assert.match(
    programmesPage,
    /buildUrlWithSource\(\s*"\/interest",\s*campaignSource,?\s*\)/,
  );
});
