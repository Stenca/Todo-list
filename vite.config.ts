import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/Todo-list/",
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
