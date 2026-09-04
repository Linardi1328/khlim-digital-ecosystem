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

test("academy-first copy localizes across supported locales", async () => {
  const messagesPath = "packages/i18n/src/messages/home-academy-web.ts";
  const messages = await read(messagesPath);
  const translator = await read("packages/i18n/src/translator.ts");

  assert.match(messages, /const en =/);
  assert.match(messages, /const ms:/);
  assert.match(messages, /const zhHans:/);
  assert.match(messages, /const zhHant:/);
  assert.match(messages, /const hi:/);
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
