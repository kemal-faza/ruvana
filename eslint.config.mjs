import { defineConfig, globalIgnores } from "eslint/config";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/defaults";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Saran kanonik Tailwind (mis. `size-full`, `rounded-xs`) dijadikan error agar
  // kelas non-kanonik tertangkap CI, bukan hanya muncul di editor. Setelan editor
  // untuk diagnostic yang sama dimatikan lewat .vscode/settings.json.
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: {
      "better-tailwindcss": {
        entryPoint: "app/globals.css",
        rootFontSize: 16,
        // Selector bawaan hanya menjaring variabel bernama `classNames?`,
        // `classes`, atau `styles?`. Konstanta kelas di proyek ini bernama
        // `SHELL` dan `fieldClass`, jadi ditambahkan eksplisit.
        selectors: [
          ...getDefaultSelectors(),
          { kind: "variable", name: "^(SHELL|fieldClass)$", match: [{ type: "strings" }] },
        ],
      },
    },
    rules: {
      "better-tailwindcss/enforce-canonical-classes": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".worktrees/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
