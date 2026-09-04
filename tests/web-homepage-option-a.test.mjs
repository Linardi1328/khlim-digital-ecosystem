import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const rootUrl = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, rootUrl), "utf8");

test("public homepage keeps the academy ahead of Khero", async () => {
  const homepage = await read("apps/web/app/page.tsx");

  assert.match(homepage, /<HeroCarousel/);
  assert.match(homepage, /home\.academyHero\.title/);
  assert.match(homepage, /showPlaceholderLabel: false/);
  assert.match(homepage, /<AcademyPillarsSection \/>/);
  assert.match(homepage, /<KheroSection \/>/);
  assert.ok(
    homepage.indexOf("<AcademyPillarsSection />") <
      homepage.indexOf("<KheroSection />"),
    "Khero should remain a supporting section after core academy content",
  );
  assert.doesNotMatch(homepage, /PhotoStorySection|PhotoGallery/);
  assert.doesNotMatch(homepage, /\/media\/khero\/.*heroSlides/);
});

test("Khero supports brand storytelling and member points", async () => {
  const section = await read("apps/web/components/home/khero-section.tsx");

  for (const poster of [
    "khero-meaning.webp",
    "khero-way.webp",
    "meet-khero.webp",
    "coming-soon.webp",
  ]) {
    assert.match(section, new RegExp(`/media/khero/${poster}`));
    await access(new URL(`apps/web/public/media/khero/${poster}`, rootUrl));
  }

  assert.match(section, /home\.khero\.points\.title/);
  assert.match(section, /href="\/portal"/);
  assert.match(section, /from "next\/image"/);
});

test("academy-first homepage copy is localized across supported locales", async () => {
  const messages = await read(
    "packages/i18n/src/messages/home-academy-web.ts",
  );
  const translator = await read("packages/i18n/src/translator.ts");

  for (const locale of ["en", "ms", "zh-Hans", "zh-Hant", "hi"]) {
    assert.match(messages, new RegExp(`(?:const ${locale.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}|\\"${locale}\\")`));
  }

  assert.match(messages, /home\.academyHero\.title/);
  assert.match(messages, /home\.khero\.points\.title/);
  assert.match(translator, /homeAcademyWebMessages/);
});

test("academy-first visual system is loaded by the public app", async () => {
  const layout = await read("apps/web/app/layout.tsx");
  const styles = await read("apps/web/app/home-academy.css");

  assert.match(layout, /import "\.\/home-academy\.css"/);
  assert.match(styles, /\.home-academy-pillars/);
  assert.match(styles, /\.home-khero-poster-grid/);
  assert.match(styles, /\.home-khero-points/);
});
