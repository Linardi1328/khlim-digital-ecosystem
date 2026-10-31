import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  createRetryableAsyncOnce,
  getWorkerBundleDir,
} from "./browser-bundle-cache.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "../..");
const webpack = require(
  path.join(
    root,
    "apps/web/node_modules/next/dist/compiled/webpack/webpack.js",
  ),
).webpack;

const getBuiltBundle = createRetryableAsyncOnce(async () => {
  try {
    return await buildTestBundle();
  } finally {
    // The compiled bundle has already been read into memory; never leave
    // per-worker build artifacts behind, even after compilation failure.
    fs.rmSync(getWorkerBundleDir(root), { recursive: true, force: true });
  }
});
const accessibilityCss = fs.readFileSync(
  path.join(root, "apps/web/app/accessibility.css"),
  "utf8",
);
const editorialCss = fs.readFileSync(
  path.join(root, "apps/web/app/editorial.css"),
  "utf8",
);
const globalsCss = fs.readFileSync(
  path.join(root, "apps/web/app/globals.css"),
  "utf8",
);
const publicHeaderCss = fs.readFileSync(
  path.join(root, "apps/web/components/layout/public-header.module.css"),
  "utf8",
);

export async function getTestBundle() {
  return getBuiltBundle();
}

async function buildTestBundle() {
  const tempDir = getWorkerBundleDir(root);
  fs.mkdirSync(tempDir, { recursive: true });

  const loaderPath = path.join(tempDir, "ts-loader.cjs");
  fs.writeFileSync(
    loaderPath,
    `const ts = require("typescript");
module.exports = function(source) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: this.resourcePath,
  });
  return result.outputText;
};`,
  );

  const mockImage = path.join(tempDir, "mock-next-image.cjs");
  fs.writeFileSync(
    mockImage,
    `const React = require("react");
module.exports = function Image(props) {
  return React.createElement("img", props);
};`,
  );

  const mockLink = path.join(tempDir, "mock-next-link.cjs");
  fs.writeFileSync(
    mockLink,
    `const React = require("react");
module.exports = function Link({ href, children, ...props }) {
  return React.createElement("a", { href, ...props }, children);
};`,
  );

  const mockCss = path.join(tempDir, "mock-css-loader.cjs");
  fs.writeFileSync(
    mockCss,
    `module.exports = function() {
      return "const p = new Proxy({}, { get: (t, prop) => { if (prop === '__esModule') return true; if (prop === 'default') return p; return typeof prop === 'string' ? prop : undefined; } }); module.exports = p;";
    };`,
  );

  const mockAuth = path.join(tempDir, "mock-auth-context.cjs");
  fs.writeFileSync(
    mockAuth,
    `const React = require("react");
const AuthContext = React.createContext({
  isAuthenticated: false,
  account: null,
  guardianProfile: null,
  isLoading: false,
});
module.exports = {
  AuthContext,
  AuthProvider: ({ children }) => React.createElement(AuthContext.Provider, { value: { isAuthenticated: false, account: null, guardianProfile: null, isLoading: false } }, children),
  useAuth: () => React.useContext(AuthContext),
};`,
  );

  const mockNavigation = path.join(tempDir, "mock-next-navigation.cjs");
  fs.writeFileSync(
    mockNavigation,
    `module.exports = {
  notFound: function notFound() {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: function useRouter() {
    return { push: () => {}, replace: () => {}, back: () => {} };
  },
  usePathname: function usePathname() {
    return "/";
  },
  useSearchParams: function useSearchParams() {
    return new URLSearchParams();
  },
};`,
  );

  const entryPath = path.join(tempDir, "entry.tsx");
  fs.writeFileSync(
    entryPath,
    `
import React from "react";
import { createRoot } from "react-dom/client";
import { AchievementsSection } from "${path.join(root, "apps/web/components/home/achievements-section.tsx")}";
import { PlayerSpotlightSection } from "${path.join(root, "apps/web/components/home/player-spotlight-section.tsx")}";
import { SpotlightArticleContent } from "${path.join(root, "apps/web/components/editorial/spotlight-article-content.tsx")}";
import { HeroCarousel } from "${path.join(root, "apps/web/components/home/hero-carousel.tsx")}";
import { LocaleSwitcher } from "${path.join(root, "apps/web/components/layout/locale-switcher.tsx")}";
import { PublicHeader } from "${path.join(root, "apps/web/components/layout/public-header.tsx")}";
import { I18nProvider } from "${path.join(root, "apps/web/lib/i18n-context.tsx")}";
import CookiePolicyPage from "${path.join(root, "apps/web/app/cookies/page.tsx")}";
import PrivacyPolicyPage from "${path.join(root, "apps/web/app/privacy/page.tsx")}";
import TermsPage from "${path.join(root, "apps/web/app/terms/page.tsx")}";
import RefundPolicyPage from "${path.join(root, "apps/web/app/refunds/page.tsx")}";
import MediaPreviewPage from "${path.join(root, "apps/web/app/preview/media/page.tsx")}";
import SpotlightArchivePage from "${path.join(root, "apps/web/app/spotlight/page.tsx")}";

let activeRoot = null;


window.__mount = {
  heroCarousel: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(HeroCarousel, props))
    );
  },
  spotlightArchivePage: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(SpotlightArchivePage, props))
    );
  },
  achievements: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, null, React.createElement(AchievementsSection, props))
    );
  },
  spotlightSection: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, null, React.createElement(PlayerSpotlightSection, props))
    );
  },
  spotlightArticle: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, null, React.createElement(SpotlightArticleContent, props))
    );
  },
  localeSwitcher: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, null, React.createElement(LocaleSwitcher, props))
    );
  },
  publicHeader: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(PublicHeader, props))
    );
  },
  cookiesPage: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(CookiePolicyPage, props))
    );
  },
  privacyPage: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(PrivacyPolicyPage, props))
    );
  },
  termsPage: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(TermsPage, props))
    );
  },
  refundsPage: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(RefundPolicyPage, props))
    );
  },
  legalDocument: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(LegalDocument, props))
    );
  },
  mediaPreviewPage: (container, props = {}) => {
    if (activeRoot) { activeRoot.unmount(); }
    activeRoot = createRoot(container);
    activeRoot.render(
      React.createElement(I18nProvider, { initialLocale: props.initialLocale }, React.createElement(MediaPreviewPage, props))
    );
  },
};
`,
  );

  const bundleFile = path.join(tempDir, "bundle.js");
  if (fs.existsSync(bundleFile)) fs.unlinkSync(bundleFile);

  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "development",
      entry: entryPath,
      output: {
        path: tempDir,
        filename: "bundle.js",
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        alias: {
          react: path.join(root, "apps/web/node_modules/react"),
          "react-dom": path.join(root, "apps/web/node_modules/react-dom"),
          "next/image": mockImage,
          "next/link": mockLink,
          "next/navigation": mockNavigation,
          "@khlim/i18n": path.join(root, "packages/i18n/src/index.ts"),
          "@khlim/api-client": path.join(
            root,
            "packages/api-client/src/index.ts",
          ),
          [path.join(root, "apps/web/lib/auth-context")]: mockAuth,
          "../../lib/auth-context": mockAuth,
          "../lib/auth-context": mockAuth,
        },
      },
      module: {
        rules: [
          {
            test: /\.[jt]sx?$/,
            exclude: /node_modules/,
            use: [loaderPath],
          },
          {
            test: /\.css$/,
            use: [mockCss],
          },
        ],
      },
    });

    compiler.run((err, stats) => {
      if (err) return reject(err);
      if (stats.hasErrors()) {
        return reject(new Error(JSON.stringify(stats.toJson().errors)));
      }
      resolve();
    });
  });

  return fs.readFileSync(bundleFile, "utf8");
}

export async function mountComponent(
  page,
  { component, env = {}, props = {} },
) {
  const bundle = await getTestBundle();
  const testUrl = `http://localhost:3000/test-${component}-${Date.now()}`;

  await page.route(testUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${globalsCss}</style>
  <style>${editorialCss}</style>
  <style>${accessibilityCss}</style>
  <style>${publicHeaderCss}</style>
  <style>
    body {
      margin: 0;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.process = { env: ${JSON.stringify(env)} };
  </script>
  <script>${bundle}</script>
  <script>
    window.__mount["${component}"](document.getElementById("root"), ${JSON.stringify(props)});
  </script>
</body>
</html>`,
    });
  });

  await page.goto(testUrl);
}
