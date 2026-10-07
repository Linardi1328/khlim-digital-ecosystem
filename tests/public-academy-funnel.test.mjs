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

  // Home communicates KHLIM Academy, pathway (U9/U12/U15) and venue
  assert.match(
    homePage,
    /pathwayBadge=\{t\("home\.academyHero\.pathwayBadge"\)\}/,
  );
  assert.match(homePage, /venueBadge=\{/);
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

  // Above the fold Register Interest CTA
  assert.match(
    academyPage,
    /href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?<Button variant="primary" size="lg">[\s\S]*?\{t\("nav\.registerInterest"\)\}/,
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

  // Final Register Interest CTA
  assert.match(academyPage, /academy\.finalCta\.title/);
  assert.match(
    academyPage,
    /href=\{buildUrlWithSource\("\/interest", campaignSource\)\}[\s\S]*?<Button variant="primary"/,
  );

  // Internal links use buildUrlWithSource
  assert.doesNotMatch(academyPage, /<Link href="\/programmes">/);
  assert.match(
    academyPage,
    /buildUrlWithSource\("\/programmes", campaignSource\)/,
  );
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
