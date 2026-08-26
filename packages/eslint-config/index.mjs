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
