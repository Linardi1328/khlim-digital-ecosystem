import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const css = await readFile(
  new URL("../apps/web/app/editorial.css", import.meta.url),
  "utf8",
);

const normalizedCss = css.replace(/\s+/g, " ");

function block(selector) {
  const normalized = selector.replace(/\s+/g, " ");
  const at = normalizedCss.indexOf(normalized + " {");
  assert.ok(at >= 0, `Missing CSS selector: ${selector}`);
  const end = normalizedCss.indexOf("}", at);
  return normalizedCss.slice(at, end + 1);
}

test("club gallery cards use a uniform 4:3 media frame", () => {
  assert.match(
    block(".spotlight-gallery-image-wrapper"),
    /aspect-ratio:\s*4\s*\/\s*3/,
  );
  assert.match(css, /\.spotlight-gallery-photo\s*\{\s*object-fit:\s*contain/);
  assert.match(
    block(".spotlight-gallery-photo-link,\n.spotlight-gallery-photo"),
    /height:\s*100%/,
  );
});

test("verified milestone grids keep entire approved photos visible", () => {
  assert.match(
    block(".verified-milestone-media"),
    /aspect-ratio:\s*4\s*\/\s*3/,
  );
  assert.match(css, /\.verified-milestone-photo\s*\{\s*object-fit:\s*contain/);
  assert.match(
    block(".verified-milestone-photo-link,\n.verified-milestone-photo"),
    /height:\s*100%/,
  );
  assert.doesNotMatch(
    css,
    /\.verified-milestone-photo\s*\{\s*object-fit:\s*cover/,
  );
});
