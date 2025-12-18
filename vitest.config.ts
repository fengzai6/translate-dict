import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    benchmark: {
      include: ["src/**/*.bench.ts"],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "out/",
        "**/*.test.ts",
        "**/*.bench.ts",
        "scripts/",
      ],
    },
  },
});
