import { defineConfig } from '@playwright/test';

/**
 * Scaffolded by Hover so crystallized specs (which use relative URLs like
 * page.goto("/")) resolve against a base. Override HOVER_BASE_URL in CI to
 * point the same specs at staging/prod.
 */
export default defineConfig({
  testDir: './__vibe_tests__',
  use: {
    baseURL: process.env.HOVER_BASE_URL ?? "http://localhost:5173",
  },
});
