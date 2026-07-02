import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit test runner configuration. Tests are co-located as `*.test.ts` next to
// the code they cover. Node environment — server-side modules only for now.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
