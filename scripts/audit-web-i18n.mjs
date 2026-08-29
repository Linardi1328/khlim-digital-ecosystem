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

const findings = [];

for (const file of roots.flatMap(walkDirectory)) {
  const sourceText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function add(node, kind, value) {
    const text = normalize(value);
    if (!isCandidate(text)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    findings.push({ file, line: line + 1, kind, text });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      add(node, "jsx-text", node.getText(source));
    }

    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      if (userFacingAttributes.has(name) && ts.isStringLiteral(node.initializer)) {
        add(node, `attribute:${name}`, node.initializer.text);
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      if (messageSetterNames.has(callee) && node.arguments[0]) {
        const first = node.arguments[0];
        if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
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
  console.log("Web i18n audit passed: no obvious hard-coded user-facing strings found.");
  process.exit(0);
}

console.error(`Web i18n audit found ${findings.length} potential hard-coded strings:\n`);
for (const finding of findings) {
  console.error(
    `${finding.file}:${finding.line} [${finding.kind}] ${JSON.stringify(finding.text)}`,
  );
}
process.exit(1);
