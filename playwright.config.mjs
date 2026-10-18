import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:120_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  workers:1,
  reporter:[['list']],
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true,
    actionTimeout:8_000,
    navigationTimeout:15_000
  },
  webServer:{
    command:'node scripts/serve-dist.mjs',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:20_000
  }
});
