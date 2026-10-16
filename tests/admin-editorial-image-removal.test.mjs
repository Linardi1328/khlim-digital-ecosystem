import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pagePath = path.join(root, "apps/admin/app/editorial/page.tsx");

function transpileEditorialPage() {
  const source = fs.readFileSync(pagePath, "utf-8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: pagePath,
  }).outputText;
}

function loadEditorialModule(dependencies = {}) {
  const compiled = transpileEditorialPage();
  const module = { exports: {} };
  const defaultDeps = {
    react: {
      useEffect: () => {},
      useState: (initial) => [initial, () => {}],
    },
    "react/jsx-runtime": {
      jsx: () => null,
      jsxs: () => null,
      Fragment: () => null,
    },
    "next/link": ({ children }) => children,
    "../../components/layout/AdminShell": ({ children }) => children,
    "../../components/ui/PageHeader": () => null,
    "../../components/ui/Button": ({ children }) => children,
    "../../lib/auth-context": {
      useAdminAuth: () => ({
        hasRole: () => true,
        user: { role: "MANAGEMENT" },
      }),
    },
    "../../lib/admin-api": {
      getAdminAccessToken: () => "synthetic-mock-token-123",
    },
  };

  const sandbox = {
    module,
    exports: module.exports,
    process: {
      env: {
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001/v1",
      },
    },
    encodeURIComponent,
    fetch: globalThis.fetch,
    require: (specifier) => {
      if (specifier in dependencies) return dependencies[specifier];
      if (specifier in defaultDeps) return defaultDeps[specifier];
      throw new Error(`Unexpected dependency in test: ${specifier}`);
    },
  };

  vm.runInNewContext(compiled, sandbox, { filename: pagePath });
  return module.exports;
}

test("clearEditorialDraftImage sends PATCH /v1/admin/editorial/:id with imageUrl: null", async () => {
  const { clearEditorialDraftImage } = loadEditorialModule();
  const syntheticDraftId = "synthetic-draft-entry-001";
  const calls = [];

  const mockApiFetch = async (path, init) => {
    calls.push({ path, init });
    return {
      id: syntheticDraftId,
      status: "DRAFT",
      imageUrl: null,
    };
  };

  const result = await clearEditorialDraftImage(syntheticDraftId, mockApiFetch);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, `/admin/editorial/${syntheticDraftId}`);
  assert.equal(calls[0].init.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].init.body), { imageUrl: null });
  assert.equal(result.imageUrl, null);
});

test("clearEditorialDraftImage handles URL encoding and propagates HTTP error states", async () => {
  const { clearEditorialDraftImage } = loadEditorialModule();
  const trickyDraftId = "synthetic/draft?id=special#1";
  const calls = [];

  const mockApiFetch = async (path, init) => {
    calls.push({ path, init });
    throw new Error(
      "HTTP 400: Published content must be unpublished by management before editing",
    );
  };

  await assert.rejects(
    () => clearEditorialDraftImage(trickyDraftId, mockApiFetch),
    /Published content must be unpublished/,
  );

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    `/admin/editorial/${encodeURIComponent(trickyDraftId)}`,
  );
  assert.equal(calls[0].init.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].init.body), { imageUrl: null });
});

test("Editorial Studio template enforces draft-only image removal and published edit lock", () => {
  const source = fs.readFileSync(pagePath, "utf-8");

  // Check draft-only conditional rendering of Remove image button
  assert.match(
    source,
    /entry\.status === "DRAFT" && Boolean\(entry\.imageUrl\)/,
    "Remove image action must be rendered only for drafts with an image",
  );
  assert.match(
    source,
    />\s*Remove image\s*<\/Button>/,
    "Must expose Remove image button for drafts",
  );

  // Check draft-only guard inside removeImage function
  assert.match(
    source,
    /if \(entry\.status !== "DRAFT"\)/,
    "removeImage must explicitly guard against modifying non-drafts",
  );

  // Check published entry lock preservation
  assert.match(
    source,
    /Published content is locked from editing until Management unpublishes it/,
    "Must preserve the published content edit lock",
  );
});

test("Editorial Studio review state reflects youth media clearance blockers and moderation readiness", () => {
  const source = fs.readFileSync(pagePath, "utf-8");

  // Blocker message when an image URL is present on a draft
  assert.match(
    source,
    /Attached images must be cleared before publication; youth media rights are not verified/,
    "Drafts with image URL must surface youth media clearance blocker",
  );

  // Moderation readiness once verified and image cleared
  assert.match(
    source,
    /Ready for Management moderation and publication review/,
    "Clean drafts must show readiness for management moderation",
  );

  // Accessible success and error presentation
  assert.match(
    source,
    /role="status"/,
    "Must provide accessible status announcement for user actions",
  );
  assert.match(
    source,
    /role="alert"/,
    "Must provide accessible alert announcement for errors",
  );
});

test("Editorial Studio reloads moderation queue data and editorial entries upon image removal", () => {
  const source = fs.readFileSync(pagePath, "utf-8");

  assert.match(
    source,
    /api\("\/admin\/editorial\/moderation"\)/,
    "Editorial studio must fetch moderation queue data for management reviewers",
  );
  assert.match(
    source,
    /await clearEditorialDraftImage\(entry\.id,\s*api\)/,
    "removeImage action must invoke draft image clearing contract",
  );
  assert.match(
    source,
    /await load\(\)/,
    "Must reload editorial and moderation data after clearing image",
  );
});
