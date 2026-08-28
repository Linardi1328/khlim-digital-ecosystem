from pathlib import Path

archive = Path("apps/web/app/spotlight/page.tsx")
text = archive.read_text()
if not text.startswith('"use client"'):
    text = '"use client";\n\n' + text
text = text.replace('import Link from "next/link";', 'import React, { useEffect, useState } from "react";\nimport Link from "next/link";')
text = text.replace('} from "../../lib/editorial-content";', '} from "../../lib/editorial-content";\nimport { fetchPublishedSpotlights } from "../../lib/editorial-api";')
text = text.replace(
'''export default function PlayerSpotlightArchivePage() {
  const preview = publishedPlayerSpotlights.length === 0;
  const stories = preview
    ? [playerSpotlightEditorialPreview]
    : publishedPlayerSpotlights;
''',
'''export default function PlayerSpotlightArchivePage() {
  const [remote, setRemote] = useState<typeof publishedPlayerSpotlights>([]);
  useEffect(() => {
    void fetchPublishedSpotlights().then(setRemote).catch(() => undefined);
  }, []);
  const live = remote.length > 0 ? remote : publishedPlayerSpotlights;
  const preview = live.length === 0;
  const stories = preview ? [playerSpotlightEditorialPreview] : live;
''')
archive.write_text(text)

article = Path("apps/web/app/spotlight/[slug]/page.tsx")
text = article.read_text()
if 'fetchPublishedSpotlight' not in text:
    text = text.replace('} from "../../../lib/editorial-content";', '} from "../../../lib/editorial-content";\nimport { fetchPublishedSpotlight } from "../../../lib/editorial-api";')
    helper = '''\nasync function resolveSpotlight(slug: string) {\n  const remote = await fetchPublishedSpotlight(slug).catch(() => null);\n  return remote ?? findSpotlightArticle(slug);\n}\n'''
    text = text.replace('\ntype SpotlightPageProps = {', helper + '\ntype SpotlightPageProps = {')
    text = text.replace('  const article = findSpotlightArticle(slug);', '  const article = await resolveSpotlight(slug);', 2)
article.write_text(text)

regression = Path("tests/phase-6-editorial-studio.test.mjs")
text = regression.read_text()
if 'shareable route resolves persisted' not in text:
    text += '''\n\ntest("shareable Player Spotlight route resolves persisted editorial API data", async () => {\n  const archive = await read("apps/web/app/spotlight/page.tsx");\n  const article = await read("apps/web/app/spotlight/[slug]/page.tsx");\n  assert.match(archive, /fetchPublishedSpotlights/);\n  assert.match(article, /fetchPublishedSpotlight/);\n  assert.match(article, /resolveSpotlight/);\n});\n'''
regression.write_text(text)
