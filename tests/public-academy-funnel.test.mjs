import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Home hero and final CTA make Register Interest the primary acquisition path without competing full enrolment", async () => {
  const homePage = await read("apps/web/app/page.tsx");
  const heroCarousel = await read("apps/web/components/home/hero-carousel.tsx");

  // Hero carousel actions use /interest as primary CTA with preserved source
  assert.match(heroCarousel, /buildUrlWithSource\("\/interest", source\)/);
  assert.match(heroCarousel, /variant="primary"/);
  assert.match(heroCarousel, /t\("nav\.registerInterest"\)/);

  // Full enrolment must not compete as a hero CTA
  assert.doesNotMatch(heroCarousel, /href=\{buildUrlWithSource\("\/enrol"/);
  assert.doesNotMatch(heroCarousel, /href="\/enrol"/);

  // Secondary CTA is explore programmes
  assert.match(heroCarousel, /buildUrlWithSource\("\/programmes", source\)/);

  // Home communicates KHLIM Academy and pathway (U9/U12/U15)
  assert.match(
    homePage,
    /pathwayBadge=\{t\("home\.academyHero\.pathwayBadge"\)\}/,
  );
  assert.match(homePage, /venueBadge=\{activeBasketballVenueName\}/);
  assert.doesNotMatch(homePage, /home\.academyHero\.venueBadge/);
  assert.doesNotMatch(homePage, /Taylor/);
  assert.match(heroCarousel, /pathwayBadge/);
  assert.match(heroCarousel, /venueBadge/);

  // Home final CTA section uses /interest as primary, /programmes as secondary, and no /enrol
  assert.match(homePage, /className="home-join-cta-actions"/);
  assert.match(
    homePage,
    /href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?<Button variant="primary"/,
  );
  assert.doesNotMatch(
    homePage,
    /href=\{buildUrlWithSource\("\/enrol", campaignSource\)\}/,
  );
});

test("PublicHeader makes low-friction Register Interest the primary acquisition CTA for anonymous users while preserving auth and portal navigation", async () => {
  const header = await read("apps/web/components/layout/public-header.tsx");

  // Anonymous desktop header has Login (outline) and Register Interest (primary)
  assert.match(
    header,
    /href="\/auth\/login"[\s\S]*?<Button variant="outline" size="sm">[\s\S]*?\{t\("nav\.login"\)\}/,
  );
  assert.match(
    header,
    /href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?<Button variant="primary" size="sm">[\s\S]*?\{t\("nav\.registerInterest"\)\}/,
  );

  // Anonymous mobile quick actions has Login and Register Interest
  assert.match(
    header,
    /public-header-mobile-quick-actions[\s\S]*?href="\/auth\/login"[\s\S]*?<Button[\s\S]*?variant="outline"/,
  );
  assert.match(
    header,
    /public-header-mobile-quick-actions[\s\S]*?href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?<Button[\s\S]*?variant="primary"/,
  );

  // Mobile menu sheet has Register Interest as primary and enrol demoted to outline
  assert.match(
    header,
    /href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?<Button[\s\S]*?variant="primary"[\s\S]*?\{t\("nav\.registerInterest"\)\}/,
  );
  assert.match(
    header,
    /href="\/enrol"[\s\S]*?<Button[\s\S]*?variant="outline"[\s\S]*?\{t\("nav\.register"\)\}/,
  );

  // Authenticated portal navigation is preserved
  assert.match(header, /isAuthenticated/);
  assert.match(header, /href="\/portal\/dashboard"/);
  assert.match(header, /<LocaleSwitcher \/>/);
});

test("Academy page resolves campaign source, propagates to PublicHeader and internal links, and includes funnel components", async () => {
  const academyPage = await read("apps/web/app/academy/page.tsx");

  // Campaign source resolution using existing utilities
  assert.match(academyPage, /resolveCampaignSource\(searchParams\)/);
  assert.match(academyPage, /<Suspense/);
  assert.match(
    academyPage,
    /<PublicHeader campaignSource=\{campaignSource\} \/>/,
  );

  // Above the fold Register Interest CTA (single navigation control with button styling)
  assert.match(
    academyPage,
    /href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?style=\{getButtonStyles\("primary", "lg"\)\}[\s\S]*?\{t\("nav\.registerInterest"\)\}/,
  );

  // Pathway context (U9, U12, U15)
  assert.match(academyPage, /academy\.pathway\.title/);
  assert.match(academyPage, /academy\.pathway\.u9\.title/);
  assert.match(academyPage, /academy\.pathway\.u12\.title/);
  assert.match(academyPage, /academy\.pathway\.u15\.title/);

  // Existing truthful trust signals
  assert.match(academyPage, /academy\.playerDevelopment\.title/);
  assert.match(academyPage, /academy\.teamStandards\.title/);
  assert.match(academyPage, /academy\.familyVisibility\.title/);
  assert.match(academyPage, /academy\.coaching\.title/);
  assert.match(academyPage, /academy\.venues\.title/);

  // What happens next 3-step section
  assert.match(academyPage, /academy\.nextSteps\.title/);
  assert.match(academyPage, /academy\.nextSteps\.step1\.title/);
  assert.match(academyPage, /academy\.nextSteps\.step2\.title/);
  assert.match(academyPage, /academy\.nextSteps\.step3\.title/);

  // Final Register Interest CTA (single navigation control with button styling)
  assert.match(academyPage, /academy\.finalCta\.title/);
  assert.match(
    academyPage,
    /href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?style=\{getButtonStyles\("primary", "lg"\)\}/,
  );

  // Internal links use buildUrlWithSource
  assert.doesNotMatch(academyPage, /<Link href="\/programmes">/);
  assert.match(
    academyPage,
    /buildUrlWithSource\("\/programmes", campaignSource\)/,
  );

  // No nested buttons inside links on Academy page
  assert.doesNotMatch(academyPage, /<Link[\s\S]*?<Button/);
  assert.doesNotMatch(academyPage, /<a[\s\S]*?<button/);
});

test("Campaign attribution 3x3-oct24 propagates across Home -> Academy -> Programmes -> Interest navigation", async () => {
  const { resolveCampaignSource, buildUrlWithSource } = await import(
    new URL("apps/web/lib/campaign-source.ts", root).href
  );

  const eventCampaign = "3x3-oct24";

  // 1. Landing on Home with ?source=3x3-oct24
  const homeSearchParams = new URLSearchParams({ source: eventCampaign });
  const homeResolved = resolveCampaignSource(homeSearchParams);
  assert.equal(homeResolved, eventCampaign);

  // 2. Navigation link from Home to Academy retains 3x3-oct24
  const academyUrl = buildUrlWithSource("/academy", homeResolved);
  assert.equal(academyUrl, `/academy?source=${eventCampaign}`);

  // 3. Navigation link from Academy to Programmes retains 3x3-oct24
  const academyParams = new URLSearchParams(academyUrl.split("?")[1]);
  const academyResolved = resolveCampaignSource(academyParams);
  assert.equal(academyResolved, eventCampaign);

  const programmesUrl = buildUrlWithSource("/programmes", academyResolved);
  assert.equal(programmesUrl, `/programmes?source=${eventCampaign}`);

  // 4. Navigation link from Programmes to Interest retains 3x3-oct24
  const programmesParams = new URLSearchParams(programmesUrl.split("?")[1]);
  const programmesResolved = resolveCampaignSource(programmesParams);
  assert.equal(programmesResolved, eventCampaign);

  const interestUrl = buildUrlWithSource("/interest", programmesResolved);
  assert.equal(interestUrl, `/interest?source=${eventCampaign}`);

  // 5. Direct offering interest CTA from Programmes also retains 3x3-oct24
  const offeringInterestUrl = buildUrlWithSource(
    "/interest",
    programmesResolved,
    { offeringId: "offering-123" },
  );
  assert.equal(
    offeringInterestUrl,
    `/interest?offeringId=offering-123&source=${eventCampaign}`,
  );
});

test("Programmes list page includes age and level badges on cards for fast mobile scanning", async () => {
  const programmesPage = await read("apps/web/app/programmes/page.tsx");

  assert.match(programmesPage, /function ageLabel\(/);
  assert.match(programmesPage, /ageLabel\(offering, t\)/);
  assert.match(programmesPage, /offering\.programme\.level/);
  assert.match(
    programmesPage,
    /buildUrlWithSource\("\/interest", campaignSource, \{\s*offeringId: offering\.id,?\s*\}\)/,
  );
});

test("Authoritative venue messaging: Home has no static Taylor's fallback, surfaces basketball-only venue, and Academy translations do not hardcode Taylor's", async () => {
  const homePage = await read("apps/web/app/page.tsx");
  const homeAcademyMsgs = await read(
    "packages/i18n/src/messages/home-academy-web.ts",
  );
  const academyMsgs = await read("packages/i18n/src/messages/academy-web.ts");

  // Home has no static fallback and does not hardcode Taylor's
  assert.doesNotMatch(homePage, /Taylor/);
  assert.doesNotMatch(homePage, /home\.academyHero\.venueBadge/);
  assert.match(homePage, /venueBadge=\{activeBasketballVenueName\}/);
  assert.match(
    homePage,
    /o\.programme\.sport\.code === "BASKETBALL" &&\s*Boolean\(o\.venue\?\.name\?\.trim\(\)\)/,
  );

  // Translation files do not hardcode Taylor's in any locale
  assert.doesNotMatch(homeAcademyMsgs, /Taylor/);
  assert.doesNotMatch(homeAcademyMsgs, /home\.academyHero\.venueBadge/);
  assert.doesNotMatch(academyMsgs, /Taylor/);

  // Academy final CTA uses truthful generic copy without venue hardcoding
  assert.match(
    academyMsgs,
    /Register your interest today and we’ll help you find the most suitable current training programme\./,
  );

  // Only active basketball offering with a non-empty venue name qualifies
  const nonBasketballOfferings = [
    {
      id: "offering-football",
      programme: { sport: { code: "FOOTBALL" } },
      venue: { name: "Subang Football Arena" },
    },
  ];
  const omittedNonBasketball = nonBasketballOfferings
    .find(
      (o) =>
        o.programme.sport.code === "BASKETBALL" &&
        Boolean(o.venue?.name?.trim()),
    )
    ?.venue?.name?.trim();
  assert.equal(omittedNonBasketball, undefined);

  const mixedOfferings = [
    {
      id: "offering-1",
      programme: { sport: { code: "FOOTBALL" } },
      venue: { name: "Subang Football Arena" },
    },
    {
      id: "offering-2",
      programme: { sport: { code: "BASKETBALL" } },
      venue: { name: "   " },
    },
    {
      id: "offering-3",
      programme: { sport: { code: "BASKETBALL" } },
      venue: { name: "  SK8 Basketball Court, Serdang  " },
    },
  ];
  const dynamicVenue = mixedOfferings
    .find(
      (o) =>
        o.programme.sport.code === "BASKETBALL" &&
        Boolean(o.venue?.name?.trim()),
    )
    ?.venue?.name?.trim();
  assert.equal(dynamicVenue, "SK8 Basketball Court, Serdang");

  // When offerings are loading, empty, or fail, venueBadge evaluates to undefined (omitted)
  const emptyOfferings = [];
  const omittedVenue = emptyOfferings
    .find(
      (o) =>
        o.programme.sport.code === "BASKETBALL" &&
        Boolean(o.venue?.name?.trim()),
    )
    ?.venue?.name?.trim();
  assert.equal(omittedVenue, undefined);
});

test("Maximum-only age eligibility is supported in ageLabel and translated across all 5 locales", async () => {
  const homePage = await read("apps/web/app/page.tsx");
  const programmesPage = await read("apps/web/app/programmes/page.tsx");
  const { webMessages } = await import(
    new URL("packages/i18n/src/messages/web.ts", root).href
  );

  // Both pages support maximum-only age eligibility branch
  assert.match(
    homePage,
    /if \(maximum !== null\) return t\("programmes\.maximumAge", \{ maximum \}\);/,
  );
  assert.match(
    programmesPage,
    /if \(maximum !== null\) return t\("programmes\.maximumAge", \{ maximum \}\);/,
  );

  // Unit verification of ageLabel logic
  function testAgeLabel(offering, t) {
    const minimum = offering.programme.minimumAge;
    const maximum = offering.programme.maximumAge;
    if (minimum !== null && maximum !== null) {
      return t("programmes.ageRange", { minimum, maximum });
    }
    if (minimum !== null) return t("programmes.minimumAge", { minimum });
    if (maximum !== null) return t("programmes.maximumAge", { maximum });
    return t("programmes.ageEligibilityVaries");
  }

  const mockT = (key, params) => `${key}:${JSON.stringify(params ?? {})}`;

  // min + max
  assert.equal(
    testAgeLabel({ programme: { minimumAge: 5, maximumAge: 9 } }, mockT),
    'programmes.ageRange:{"minimum":5,"maximum":9}',
  );

  // min only
  assert.equal(
    testAgeLabel({ programme: { minimumAge: 10, maximumAge: null } }, mockT),
    'programmes.minimumAge:{"minimum":10}',
  );

  // max only
  assert.equal(
    testAgeLabel({ programme: { minimumAge: null, maximumAge: 15 } }, mockT),
    'programmes.maximumAge:{"maximum":15}',
  );

  // neither
  assert.equal(
    testAgeLabel({ programme: { minimumAge: null, maximumAge: null } }, mockT),
    "programmes.ageEligibilityVaries:{}",
  );

  // Translation key exists in webMessages across all 5 locales
  const locales = ["en", "ms", "zh-Hans", "zh-Hant", "hi"];
  for (const locale of locales) {
    assert.ok(
      webMessages[locale]?.["programmes.maximumAge"],
      `webMessages[${locale}] should define programmes.maximumAge`,
    );
  }
});

test("Hero carousel venue badge wraps safely on narrow screens without overflowing", async () => {
  const heroCarousel = await read("apps/web/components/home/hero-carousel.tsx");
  const badgeComponent = await read("apps/web/components/ui/badge.tsx");

  // Hero carousel constrains width and permits wrapping on mobile
  assert.match(heroCarousel, /venueBadge && \(/);
  assert.match(heroCarousel, /whiteSpace:\s*"normal"/);
  assert.match(heroCarousel, /maxWidth:\s*"100%"/);
  assert.match(heroCarousel, /wordBreak:\s*"break-word"/);

  // Global Badge component retains default nowrap behavior
  assert.match(badgeComponent, /whiteSpace:\s*"nowrap"/);
});

test("First-render campaign attribution derives synchronously without storage reads during render", async () => {
  const { getQueryCampaignSource } = await import(
    new URL("apps/web/lib/campaign-source.ts", root).href
  );
  const academyPage = await read("apps/web/app/academy/page.tsx");
  const homePage = await read("apps/web/app/page.tsx");
  const programmesPage = await read("apps/web/app/programmes/page.tsx");

  // Pure function extracts and sanitizes synchronously
  const searchParams = new URLSearchParams({ source: "3x3-oct24" });
  assert.equal(getQueryCampaignSource(searchParams), "3x3-oct24");
  assert.equal(getQueryCampaignSource("3x3-oct24"), "3x3-oct24");
  assert.equal(
    getQueryCampaignSource(
      new URLSearchParams({ source: "invalid token spaces" }),
    ),
    null,
  );
  assert.equal(getQueryCampaignSource(null), null);
  assert.equal(getQueryCampaignSource(undefined), null);

  // Academy page derives synchronously on first render using getQueryCampaignSource
  assert.match(
    academyPage,
    /const queryCampaign = useMemo\(\s*\(\) => getQueryCampaignSource\(searchParams\),\s*\[searchParams\],\s*\);/,
  );
  assert.match(
    academyPage,
    /const campaignSource = queryCampaign \?\? storedCampaign;/,
  );

  // resolveCampaignSource (which accesses sessionStorage) is only called inside useEffect
  assert.match(
    academyPage,
    /useEffect\(\(\) => \{\s*setStoredCampaign\(resolveCampaignSource\(searchParams\)\);\s*\}, \[searchParams\]\);/,
  );

  // Home, Programmes, About, and Contact pages follow the same first-render resolution
  assert.match(
    homePage,
    /const queryCampaign = useMemo\(\s*\(\) => getQueryCampaignSource\(searchParams\),\s*\[searchParams\],\s*\);/,
  );
  assert.match(
    homePage,
    /const campaignSource = queryCampaign \?\? storedCampaign;/,
  );
  assert.match(
    programmesPage,
    /const queryCampaign = useMemo\(\s*\(\) => getQueryCampaignSource\(searchParams\),\s*\[searchParams\],\s*\);/,
  );
  assert.match(
    programmesPage,
    /const campaignSource = queryCampaign \?\? storedCampaign;/,
  );

  const aboutPage = await read("apps/web/app/about/page.tsx");
  const contactPage = await read("apps/web/app/contact/page.tsx");

  assert.match(
    aboutPage,
    /const queryCampaign = useMemo\(\s*\(\) => getQueryCampaignSource\(searchParams\),\s*\[searchParams\],\s*\);/,
  );
  assert.match(
    aboutPage,
    /<PublicHeader campaignSource=\{campaignSource\} \/>/,
  );
  assert.match(
    aboutPage,
    /buildUrlWithSource\("\/programmes", campaignSource\)/,
  );
  assert.match(
    aboutPage,
    /<Suspense[\s\S]*?<AboutContent \/>[\s\S]*?<\/Suspense>/,
  );

  assert.match(
    contactPage,
    /const queryCampaign = useMemo\(\s*\(\) => getQueryCampaignSource\(searchParams\),\s*\[searchParams\],\s*\);/,
  );
  assert.match(
    contactPage,
    /<PublicHeader campaignSource=\{campaignSource\} \/>/,
  );
  assert.match(
    contactPage,
    /<Suspense[\s\S]*?<ContactContent \/>[\s\S]*?<\/Suspense>/,
  );
});

test("Academy pathway copy is grounded strictly in approved factual offering data (ages and Youth Development) without unsupported curriculum claims", async () => {
  const academyMsgs = await read("packages/i18n/src/messages/academy-web.ts");

  // Guards against unsupported curriculum claims and promises
  const unsupportedCurriculumPhrases = [
    "core ball handling",
    "tactical execution",
    "athletic conditioning",
    "competitive match readiness",
    "technical refinement",
    "U15 Competition",
    "Pertandingan U15",
    "U15 竞技对抗",
    "U15 競技對抗",
    "U15 प्रतियोगिता",
  ];

  for (const phrase of unsupportedCurriculumPhrases) {
    assert.doesNotMatch(
      academyMsgs,
      new RegExp(phrase, "i"),
      `academy-web.ts should not make unsupported curriculum claim "${phrase}"`,
    );
  }

  // Factual age and Youth Development copy in English
  assert.match(academyMsgs, /"academy\.pathway\.u9\.title": "U9 — Ages 5–9"/);
  assert.match(
    academyMsgs,
    /"academy\.pathway\.u9\.body":\s*"Youth Development programme for athletes aged 5 to 9\."/,
  );
  assert.match(
    academyMsgs,
    /"academy\.pathway\.u12\.title": "U12 — Ages 10–12"/,
  );
  assert.match(
    academyMsgs,
    /"academy\.pathway\.u12\.body":\s*"Youth Development programme for athletes aged 10 to 12\."/,
  );
  assert.match(
    academyMsgs,
    /"academy\.pathway\.u15\.title": "U15 — Ages 13–15"/,
  );
  assert.match(
    academyMsgs,
    /"academy\.pathway\.u15\.body":\s*"Youth Development programme for athletes aged 13 to 15\."/,
  );
});

test("Sheet component renders via createPortal to document.body, mounts safely on client, and preserves full accessibility contracts", async () => {
  const sheet = await read("apps/web/components/ui/sheet.tsx");

  // Mounts to document.body via createPortal
  assert.match(
    sheet,
    /import\s*\{[\s\S]*createPortal[\s\S]*\}\s*from\s*"react-dom"/,
  );
  assert.match(sheet, /createPortal\([\s\S]*?,\s*document\.body,?\s*\)/);

  // Client-mount guard prevents SSR hydration issues
  assert.match(
    sheet,
    /const\s*\[mounted,\s*setMounted\]\s*=\s*useState\(false\)/,
  );
  assert.match(sheet, /setMounted\(true\)/);
  assert.match(
    sheet,
    /if\s*\(!isOpen\s*\|\|\s*!mounted\s*\|\|\s*typeof\s*document\s*===\s*"undefined"\)\s*return\s*null/,
  );

  // Accessibility and dialog contracts preserved
  assert.match(sheet, /role="dialog"/);
  assert.match(sheet, /aria-modal="true"/);
  assert.match(sheet, /aria-label=\{ariaLabel\}/);
  assert.match(
    sheet,
    /aria-labelledby=\{ariaLabelledby \?\? \(title \? titleId : undefined\)\}/,
  );
  assert.match(sheet, /document\.body\.style\.overflow\s*=\s*"hidden"/);
  assert.match(sheet, /document\.body\.style\.overflow\s*=\s*"unset"/);
  assert.match(sheet, /e\.key === "Escape"/);
  assert.match(sheet, /if \(e\.target === e\.currentTarget\) onClose\(\)/);
  assert.match(sheet, /minWidth:\s*"44px"/);
  assert.match(sheet, /minHeight:\s*"44px"/);
});

test("Contact page uses authoritative getPublicBusinessDetails and renders complete business information with localized enquiry channel", async () => {
  const contactPage = await read("apps/web/app/contact/page.tsx");
  const publicPageMsgs = await read(
    "packages/i18n/src/messages/public-pages.ts",
  );

  // Authoritative business details source
  assert.match(
    contactPage,
    /import\s*\{\s*getPublicBusinessDetails\s*\}\s*from\s*"\.\.\/\.\.\/lib\/business-details"/,
  );
  assert.match(contactPage, /const business = getPublicBusinessDetails\(\)/);

  // Renders business details fields
  assert.match(contactPage, /business\.legalName/);
  assert.match(contactPage, /business\.registrationNumber/);
  assert.match(contactPage, /business\.businessAddress/);
  assert.match(contactPage, /href=\{`mailto:\$\{business\.email\}`\}/);
  assert.match(contactPage, /href=\{`tel:\$\{business\.phone\}`\}/);

  // Enquiry submission uses business email
  assert.match(contactPage, /mailto:\$\{business\.email\}\?subject=/);

  // Scoped email warning instead of claiming entire contact page unconfigured
  assert.match(contactPage, /t\("contact\.emailUnavailableTitle"\)/);
  assert.match(contactPage, /t\("contact\.emailUnavailableBody"\)/);
  assert.doesNotMatch(contactPage, /t\("contact\.notConfiguredTitle"\)/);

  // All 5 locales have the new contact translation keys
  for (const key of [
    "contact.intro",
    "contact.detailsTitle",
    "contact.enquiryTitle",
    "contact.emailUnavailableTitle",
    "contact.emailUnavailableBody",
  ]) {
    const occurrences = (
      publicPageMsgs.match(new RegExp(`"${key}":`, "g")) || []
    ).length;
    assert.equal(
      occurrences,
      5,
      `Key ${key} must be defined across all 5 locales in public-pages.ts (found ${occurrences})`,
    );
  }
});
