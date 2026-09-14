import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const roots = ["apps/web/app", "apps/web/components"];
const userFacingAttributes = new Set([
  "aria-label",
  "title",
  "placeholder",
  "alt",
  "label",
]);
const messageSetterNames = new Set([
  "setError",
  "setMessage",
  "setSuccess",
  "setStatusMessage",
  "setNotice",
]);
const allowedExact = new Set(["K", "KHLIM"]);
const bilingualLegalSurfaces = new Map([
  [
    "apps/web/app/privacy/page.tsx",
    ["englishSections", "malaySections", "<LegalDocument"],
  ],
  [
    "apps/web/app/terms/page.tsx",
    ["englishSections", "malaySections", "<LegalDocument"],
  ],
  [
    "apps/web/app/cookies/page.tsx",
    ["englishSections", "malaySections", "<LegalDocument"],
  ],
  [
    "apps/web/app/refunds/page.tsx",
    ["englishSections", "malaySections", "<LegalDocument"],
  ],
  [
    "apps/web/components/legal/legal-document.tsx",
    ['<article lang="en"', '<article lang="ms"'],
  ],
]);

function walkDirectory(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkDirectory(resolved));
    else if (entry.isFile() && resolved.endsWith(".tsx")) files.push(resolved);
  }
  return files;
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isCandidate(value) {
  const text = normalize(value);
  if (!text || allowedExact.has(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  return true;
}

function getAttributeValue(openingElement, attributeName) {
  const attribute = openingElement.attributes.properties.find(
    (candidate) =>
      ts.isJsxAttribute(candidate) &&
      candidate.name.getText() === attributeName,
  );
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer) {
    return null;
  }
  return ts.isStringLiteral(attribute.initializer)
    ? attribute.initializer.text
    : null;
}

function nearestBilingualBlock(node, source) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current)) {
      const mode = getAttributeValue(
        current.openingElement,
        "data-i18n-static",
      );
      if (mode === "bilingual") {
        const text = normalize(current.getText(source));
        const hasEnglish =
          /\b(I|Privacy|Terms|Refund|consent|guardian|Conditions)\b/i.test(
            text,
          );
        const hasMalay =
          /\b(Saya|Dasar|Terma|Bayaran|penjaga|bersetuju|persetujuan)\b/i.test(
            text,
          );
        return hasEnglish && hasMalay ? current : null;
      }
    }
    current = current.parent;
  }
  return null;
}

const findings = [];

for (const file of roots.flatMap(walkDirectory)) {
  const sourceText = fs.readFileSync(file, "utf8");
  const structuralMarkers = bilingualLegalSurfaces.get(file);
  if (structuralMarkers) {
    const missingMarkers = structuralMarkers.filter(
      (marker) => !sourceText.includes(marker),
    );
    if (missingMarkers.length > 0) {
      findings.push({
        file,
        line: 1,
        kind: "bilingual-legal-structure",
        text: `Missing required bilingual legal markers: ${missingMarkers.join(", ")}`,
      });
    }
    continue;
  }

  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function add(node, kind, value) {
    if (nearestBilingualBlock(node, source)) return;
    const text = normalize(value);
    if (!isCandidate(text)) return;
    const { line } = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    findings.push({ file, line: line + 1, kind, text });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      add(node, "jsx-text", node.getText(source));
    }

    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      if (
        userFacingAttributes.has(name) &&
        ts.isStringLiteral(node.initializer)
      ) {
        add(node, `attribute:${name}`, node.initializer.text);
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      if (messageSetterNames.has(callee) && node.arguments[0]) {
        const first = node.arguments[0];
        if (
          ts.isStringLiteral(first) ||
          ts.isNoSubstitutionTemplateLiteral(first)
        ) {
          add(first, `message:${callee}`, first.text);
        }
      }
    }

    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isStringLiteral(node.expression) ||
        ts.isNoSubstitutionTemplateLiteral(node.expression))
    ) {
      add(node.expression, "jsx-expression", node.expression.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

if (findings.length === 0) {
  console.log(
    "Web i18n audit passed: no obvious hard-coded user-facing strings found.",
  );
  process.exit(0);
}

console.error(
  `Web i18n audit found ${findings.length} potential hard-coded strings:\n`,
);
for (const finding of findings) {
  console.error(
    `${finding.file}:${finding.line} [${finding.kind}] ${JSON.stringify(finding.text)}`,
  );
}
process.exit(1);
