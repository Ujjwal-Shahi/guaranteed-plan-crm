import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/**", "jobs/**"],
      thresholds: { lines: 70, functions: 70, branches: 70 },
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
