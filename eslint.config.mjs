import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".claude/**",
      ".claude-auth/**",
      ".impeccable/**",
      ".next/**",
      "coverage/**",
      "design/**",
      "docs/**",
      "next-env.d.ts",
      "openspec/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // The browser imports src/shared, so it must never pull in server code
    // (docs/03-ARCHITECTURE.md, section 2).
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "**/server", "**/server/*"],
              message: "Code in src/shared runs in the browser too.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
