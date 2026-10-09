import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Supabase's generated types are intentionally bypassed with `as any`
      // escape hatches for columns/tables missing from the stale generated
      // types. Surface these as warnings rather than blocking errors.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // The vendored Factory Yard engine (src/world/engine). Files still carrying
    // `// @ts-nocheck` were moved verbatim and are typed as they are adapted
    // (docs/world/discovery.md §10.3 M); until then the pragma is allowed here
    // and `any` does not count against the warning ceiling. Errors stay on.
    files: ["src/world/engine/**/*.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-nocheck": false, "ts-ignore": true, "ts-expect-error": "allow-with-description" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-this-alias": "off",
      "prefer-const": "off",
    },
  },
  {
    // E2E tests and Playwright config run under Node, not the browser.
    files: ["tests/**/*.{ts,tsx}", "playwright.config.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
);
