import { chromium } from 'playwright-extra';
import { Browser } from 'playwright';

export interface CDPConnection {
  browser: Browser;
}

export async function connectOverCDP(endpoint = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222'): Promise<CDPConnection> {
  try {
    return { browser: await chromium.connectOverCDP(endpoint) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CDP connection failed (${endpoint}): ${message}`);
  }
}

export default connectOverCDP;
