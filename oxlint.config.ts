export const restrictedImports = [
  {
    target: "src/services/{book,edb,epub,search,checks}/**",
    paths: ["vue", "pinia", "@tauri-apps/api"],
  },
  { target: "src/utils/**", paths: ["vue", "pinia", "@tauri-apps/api"] },
  { target: "src/{stores,composables,components,views}/**", patterns: ["@tauri-apps/*"] },
] as const;

export default {
  plugins: ["eslint", "typescript", "vue", "vitest"],
  categories: { correctness: "error", suspicious: "error" },
  env: { browser: true },
  ignorePatterns: ["dist/**", "src-tauri/target/**"],
  overrides: restrictedImports
    .map(({ target, paths, patterns }) => ({
      files: [target],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          { ...(paths && { paths }), ...(patterns && { patterns }) },
        ],
      },
    }))
    .concat([
      { files: ["vite.config.ts"], env: { browser: false, node: true } },
      { files: ["**/__tests__/**"], env: { vitest: true } },
    ]),
};
