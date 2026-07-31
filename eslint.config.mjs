import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ferramenta de auditoria de interface: codigo de terceiro, nao versionado.
    // Sem isto o lint do projeto some sob 151 avisos que ninguem vai corrigir.
    ".claude/**",
  ]),
]);

export default eslintConfig;
