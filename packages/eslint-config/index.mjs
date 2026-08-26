import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const ignores = {
  ignores: [
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "apps/api/src/generated/prisma/**",
    "packages/api-client/src/schema.d.ts",
  ],
};

const khlimConfig = [
  ignores,
  ...tseslint.configs.recommended,
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default khlimConfig;
