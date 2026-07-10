import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { closeAnonymizedProxy } from 'proxy-chain';

import { config } from './config';
import { generateTempMailAddress, pollTempMailAPI } from './temp-mail';
import { pollForOtp } from './otp-reader';
import { ProxyConfig, buildPlaywrightProxy } from './proxy';
import { getTui } from './tui';
import connectOverCDP from './cdp';

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('user-agent-override');
chromium.use(stealth);

export interface WorkerResult {
  email: string;
  status: 'SUCCESS' | 'FAILED';
  apiKey?: string;
  baseUrl: string;
  elapsed: number;
  error?: string;
}

export interface WorkerInput {
  email: string;
  emailMethod: 'tempmail' | 'gmail';
  proxy?: ProxyConfig;
}

const XIAOMI_REGISTER_URL = process.env.XIAOMI_REGISTER_URL || 'https://account.xiaomi.com/fe/service/register?_group=DEFAULT&_sign=iV9Q5kxBqXGdbkb6kmapXvJrkZM%3D&serviceParam=%7B%22checkSafePhone%22%3Afalse%2C%22checkSafeAddress%22%3Afalse%2C%22lsrp_score%22%3A0.0%7D&showActiveX=false&theme=&needTheme=false&bizDeviceType=&_locale=en&source=&region=&sid=api-platform&qs=%253Fcallback%253Dhttps%25253A%25252F%25252Fplatform.xiaomimimo.com%25252Fsts%25253Fsign%25253DM7gfywevl3CG5YTTcZDifhK6IK8%2525253D%252526followup%25253Dhttps%2525253A%2525252F%2525252Fplatform.xiaomimimo.com%2525252Fconsole%2525252Fbalance%2526sid%253Dapi-platform&callback=https%3A%2F%2Fplatform.xiaomimimo.com%2Fsts%3Fsign%3DM7gfywevl3CG5YTTcZDifhK6IK8%253D%26followup%3Dhttps%253A%252F%252Fplatform.xiaomimimo.com%252Fconsole%252Fbalance&_uRegion=';
const MIMO_CONSOLE_URL = process.env.MIMO_CONSOLE_URL || 'https://platform.xiaomimimo.com/console/balance';

function generatePassword(): string {
  // 96 random bits plus all Xiaomi password character classes.
  return `${randomBytes(12).toString('base64url')}Aa1!`;
}

function shortError(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).substring(0, 200);
}

function appendSuccess(apiKey: string): void {
  fs.mkdirSync('output', { recursive: true });
  const count = fs.existsSync('output/success_keys.txt')
    ? fs.readFileSync('output/success_keys.txt', 'utf8').split('\n').filter(Boolean).length
    : 0;
  fs.appendFileSync('output/success_keys.txt', `${count + 1}. ${apiKey}\n`);
}

function printApiKey(apiKey: string): void {
  const count = fs.existsSync('output/success_keys.txt')
    ? fs.readFileSync('output/success_keys.txt', 'utf8').split('\n').filter(Boolean).length + 1
    : 1;
  console.log(`\n${count}. ${apiKey}\n`);
}

function appendFailed(email: string, reason: string): void {
  fs.mkdirSync('output', { recursive: true });
  fs.appendFileSync('output/failed_accounts.csv', `${email},${reason}\n`);
}

async function resolveEmail(input: WorkerInput): Promise<string> {
  if (input.emailMethod === 'gmail') return input.email;
  return generateTempMailAddress();
}

async function pollOtp(emailMethod: WorkerInput['emailMethod'], email: string, otpRequestedAt: Date): Promise<string> {
  if (emailMethod === 'gmail') {
    getTui().updateWorker(1, 'polling Gmail OTP...');
    return pollForOtp(config.gmailUsername, config.gmailAppPassword, email, Number(process.env.OTP_RETRIES || 30));
  }
  getTui().updateWorker(1, 'polling tempmail OTP...');
  return pollTempMailAPI(email, 1, Number(process.env.OTP_RETRIES || 30), otpRequestedAt);
}

interface BrowserResources {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  localProxyUrl?: string;
  ownsBrowser: boolean;
}

async function createBrowser(proxy?: ProxyConfig): Promise<BrowserResources> {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  // Proxy → launch fresh Chrome with proxy-chain bridge
  if (proxy) {
    const pwProxy = await buildPlaywrightProxy(proxy);
    try {
      const args = ['--no-sandbox', '--disable-blink-features=AutomationControlled', `--user-agent=${ua}`, '--window-size=1280,900'];
      const browser = await chromium.launch({ headless: false, args, channel: 'chrome' }).catch(() => chromium.launch({ headless: false, args }));
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        userAgent: ua, locale: 'en-US',
        proxy: { server: pwProxy.server },
      });
      await context.addInitScript('() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); }');
      return { browser, context, page: await context.newPage(), localProxyUrl: pwProxy.localUrl, ownsBrowser: true };
    } catch (error) {
      if (pwProxy.localUrl) await closeAnonymizedProxy(pwProxy.localUrl, true).catch(() => undefined);
      throw error;
    }
  }

  // No proxy → CDP mode (real Chrome)
  if (process.env.USE_CDP === '1') {
    const cdp = await connectOverCDP();
    const context = await cdp.browser.newContext();
    return { browser: cdp.browser as Browser, context, page: await context.newPage(), ownsBrowser: false };
  }

  // No proxy, no CDP → launch standalone Chrome
  const launchOpts: any = {
    headless: config.headless,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', `--user-agent=${ua}`, '--window-size=1280,900'],
  };

  let browser: Browser;
  try { browser = await chromium.launch({ ...launchOpts, channel: 'chrome' }); }
  catch { browser = await chromium.launch(launchOpts); }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: ua, locale: 'en-US' });
  await context.addInitScript('() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); }');
  return { browser, context, page: await context.newPage(), ownsBrowser: true };
}

async function acceptCookies(page: Page): Promise<void> {
  const accept = page.getByRole('button', { name: /accept cookies/i });
  if (await accept.count()) await accept.first().click().catch(() => undefined);
}

async function selectRandomRegion(page: Page): Promise<void> {
  const regions = ['Singapore', 'Armenia', 'Malaysia', 'Philippines', 'Thailand', 'Vietnam'];
  const region = process.env.XIAOMI_REGION || regions[Math.floor(Math.random() * regions.length)];

  await page.getByRole('button', { name: 'Sign up' }).click().catch(() => undefined);
  await page.getByRole('button').filter({ hasText: 'Region' }).click();
  await page.getByRole('textbox', { name: 'Search for country or region' }).fill(region.slice(0, 5));
  await page.getByText(region, { exact: true }).click();
}

async function fillXiaomiRegisterForm(page: Page, email: string, password: string): Promise<void> {
  getTui().updateWorker(1, 'filling Xiaomi form...');
  await page.goto(XIAOMI_REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await acceptCookies(page);

  await selectRandomRegion(page);

  await page.getByRole('textbox', { name: /^Email$/i }).fill(email);
  await page.getByRole('textbox', { name: /Enter your new password/i }).fill(password);
  await page.getByRole('textbox', { name: /Confirm new password/i }).fill(password);
  await page.getByRole('checkbox', { name: /I've read and agreed/i }).check({ force: true });

  const next = page.getByRole('button', { name: /^Next$/i });
  await next.waitFor({ state: 'visible', timeout: 15000 });
  await next.click();
}

async function waitForOtpPage(page: Page): Promise<void> {
  getTui().updateWorker(1, 'waiting OTP page/captcha...');
  const otpReady = page.getByText(/enter code|verification code|email verification/i).first();
  const captcha = page.frameLocator('iframe').getByRole('checkbox', { name: /not a robot/i }).first();

  for (let i = 0; i < 180; i++) {
    if (await otpReady.isVisible().catch(() => false)) return;
    if (await captcha.isVisible().catch(() => false)) {
      console.log('\nCaptcha detected. Solve it in Chrome, then wait.');
    }
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'output/otp-wait-timeout.png', fullPage: true }).catch(() => undefined);
  throw new Error('OTP page not ready after 180s');
}

async function submitOtp(page: Page, otp: string): Promise<void> {
  getTui().updateWorker(1, 'filling OTP...');
  await page.getByText(/enter code|verification code|email verification/i).first().waitFor({ timeout: 30000 }).catch(() => undefined);
  console.log('[OTP] Submitting code');

  await page.getByText(/enter code/i).click().catch(() => undefined);
  await page.keyboard.type(otp, { delay: 25 });

  const submit = page.getByRole('button', { name: /^Submit$/i }).first();
  await submit.waitFor({ state: 'visible', timeout: 3000 });
  await submit.click({ force: true });
  await page.waitForTimeout(150);
  if (await submit.isVisible().catch(() => false)) await page.keyboard.press('Enter').catch(() => undefined);
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => undefined);
}

async function createOrExtractMimoApiKey(page: Page): Promise<string> {
  getTui().updateWorker(1, 'opening MiMo console...');
  await page.waitForURL('**/console/**', { timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(2000);

  // Agreement checkbox
  try {
    const agreement = page.getByRole('checkbox', { name: /I agree to use the model in/i });
    await agreement.waitFor({ state: 'visible', timeout: 5000 });
    await agreement.check();
    await page.getByRole('button', { name: /^Confirm$/i }).click();
    await page.waitForTimeout(1000);
  } catch {}

  // Invite code
  try {
    const code = process.env.MIMO_INVITE_CODE;
    if (!code) throw new Error('MIMO_INVITE_CODE is not configured');

    const invite = page.getByRole('button', { name: /Enter invite code/ });
    await invite.waitFor({ state: 'visible', timeout: 5000 });
    console.log('[INVITE] Button found, clicking...');
    await invite.click();
    await page.waitForTimeout(1000);

    await page.getByRole('textbox', { name: 'OTP Input 1' }).waitFor({ state: 'visible', timeout: 5000 });
    console.log('[INVITE] Input found, typing code...');
    for (let i = 0; i < code.length; i++) {
      await page.getByRole('textbox', { name: `OTP Input ${i + 1}` }).fill(code[i]);
    }
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Redeem & get $2 credits' }).click();
    console.log('[INVITE] Redeemed!');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'close', exact: true }).click();
    await page.waitForTimeout(500);
  } catch (err) {
    console.log(`[INVITE] Skipped: ${err instanceof Error ? err.message : String(err)}`);
  }

  await page.getByRole('link', { name: 'API Keys' }).click();

  const createButton = page.getByRole('button', { name: /^Create API Key$/i }).first();
  await createButton.waitFor({ state: 'visible', timeout: 15000 });
  await createButton.click();

  const nameInput = page.getByRole('textbox', { name: 'API Key Name *' });
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill(`MimoAuto-${Date.now()}`);

  await page.getByRole('button', { name: /^Confirm$/i }).click();
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: /^Copy$/i }).click().catch(() => undefined);
  const copied = await page.evaluate(() => (globalThis as any).navigator?.clipboard?.readText?.()).catch(() => '');
  if (copied && /^[A-Za-z0-9_-]{20,}$/.test(copied)) {
    printApiKey(copied);
    return copied;
  }

  const text = await page.locator('body').innerText().catch(() => '');
  const key = text.match(/\b(?:sk|ak|mi|mimo)[-_A-Za-z0-9]{16,}\b/i)?.[0]
    || text.match(/\b[A-Za-z0-9_-]{32,}\b/)?.[0];

  if (!key) {
    await page.screenshot({ path: 'output/mimo-console.png', fullPage: true }).catch(() => undefined);
    throw new Error('API key not found; screenshot saved to output/mimo-console.png');
  }
  return key;
}

export async function runWorker(input: WorkerInput): Promise<WorkerResult> {
  const tui = getTui();
  const start = Date.now();
  let resources: BrowserResources | null = null;
  const password = generatePassword();
  const email = await resolveEmail(input);

  try {
    tui.claimWorker(email, input.proxy ? `${input.proxy.ip}:${input.proxy.port}` : undefined);
    resources = await createBrowser(input.proxy);

    await fillXiaomiRegisterForm(resources.page, email, password);
    await waitForOtpPage(resources.page);
    const otpRequestedAt = new Date(Date.now() - 5 * 60_000);
    const otp = await pollOtp(input.emailMethod, email, otpRequestedAt);
    await submitOtp(resources.page, otp);
    const apiKey = await createOrExtractMimoApiKey(resources.page);

    const elapsed = Math.floor((Date.now() - start) / 1000);
    appendSuccess(apiKey);
    tui.freeWorker(1, 'SUCCESS');
    return { email, status: 'SUCCESS', apiKey, baseUrl: MIMO_CONSOLE_URL, elapsed };
  } catch (err) {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    appendFailed(email, shortError(err));
    try { tui.freeWorker(1, 'FAILED'); } catch {}
    return { email, status: 'FAILED', baseUrl: MIMO_CONSOLE_URL, elapsed, error: shortError(err) };
  } finally {
    if (resources) {
      await resources.context.close().catch(() => undefined);
      if (resources.ownsBrowser) await resources.browser.close().catch(() => undefined);
      if (resources.localProxyUrl) await closeAnonymizedProxy(resources.localProxyUrl, true).catch(() => undefined);
    }
  }
}
