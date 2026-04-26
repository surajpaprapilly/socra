import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    { name: 'iPhone 14', use: { ...devices['iPhone 14'] } },
    { name: 'Pixel 5',   use: { ...devices['Pixel 5'] } },
  ],
});
