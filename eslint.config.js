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
    // E2E tests and Playwright config run under Node, not the browser.
    files: ["tests/**/*.{ts,tsx}", "playwright.config.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
);
