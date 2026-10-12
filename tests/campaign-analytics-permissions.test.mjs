import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminRequire = createRequire(path.join(root, "apps/admin/package.json"));
const React = adminRequire("react");
const { renderToStaticMarkup } = adminRequire("react-dom/server");

function renderCampaignWithSession(session) {
  const filename = path.join(
    root,
    "apps/admin/app/insights/campaigns/page.tsx",
  );
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf-8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;

  let analyticsRequests = 0;
  const shell = ({ children }) => React.createElement("main", null, children);
  const header = ({ title }) => React.createElement("h1", null, title);
  const dependencies = {
    react: React,
    "react/jsx-runtime": adminRequire("react/jsx-runtime"),
    "next/link": () => null,
    "../../../components/layout/AdminShell": { AdminShell: shell },
    "../../../components/ui/PageHeader": { PageHeader: header },
    "../../../components/ui/MetricCard": { MetricCard: () => null },
    "../../../components/ui/StatusBadge": { StatusBadge: () => null },
    "../../../components/ui/Button": { Button: () => null },
    "../../../components/ui/LoadingState": { LoadingState: () => null },
    "../../../components/ui/ErrorState": { ErrorState: () => null },
    "../../../lib/auth-context": { useAdminAuth: () => session },
    "../../../lib/admin-api": {
      getAdminCampaignAnalytics: async () => {
        analyticsRequests += 1;
        throw new Error("Restricted sessions must not fetch analytics");
      },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(
    compiled,
    {
      module,
      exports: module.exports,
      require: (specifier) => {
        if (!Object.hasOwn(dependencies, specifier)) {
          throw new Error(`Unexpected campaign page dependency: ${specifier}`);
        }
        return dependencies[specifier];
      },
    },
    { filename },
  );

  const page = React.createElement(module.exports.default);
  const markup = renderToStaticMarkup(page);
  return { markup, analyticsRequests };
}

test("campaign analytics renders Restricted Access for a staff role without permission", () => {
  const result = renderCampaignWithSession({
    user: { id: "non-privileged-staff" },
    hasRole: () => false,
    isAuthenticated: true,
    isDemoMode: false,
    mfaSatisfied: true,
  });
  assert.match(result.markup, /Restricted Access/);
  assert.doesNotMatch(result.markup, /Campaign Overview Metrics/);
  assert.equal(result.analyticsRequests, 0);
});

test("campaign analytics renders Restricted Access for a privileged staff user without MFA", () => {
  const result = renderCampaignWithSession({
    user: { id: "unverified-academy-admin" },
    hasRole: () => true,
    isAuthenticated: true,
    isDemoMode: false,
    mfaSatisfied: false,
  });
  assert.match(result.markup, /Restricted Access/);
  assert.match(result.markup, /verified MFA sessions/);
  assert.doesNotMatch(result.markup, /Campaign Overview Metrics/);
  assert.equal(result.analyticsRequests, 0);
});
