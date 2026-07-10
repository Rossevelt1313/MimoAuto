import { getTui } from './tui';

const TEMP_MAIL_BASE = 'https://tinyhost.shop';
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const FALLBACK_DOMAINS = ['graphiclens.site', 'sewink.my.id', 'nexorabio.pro.vn'];

function randomLocal(): string {
  const length = 8 + Math.floor(Math.random() * 3);
  let local = '';
  for (let i = 0; i < length; i++) local += CHARS[Math.floor(Math.random() * CHARS.length)];
  return local;
}

async function getRandomDomain(): Promise<string> {
  try {
    const response = await fetch(`${TEMP_MAIL_BASE}/api/random-domains/?limit=10`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { domains?: string[] };
    const domains = data.domains?.filter(Boolean) || [];
    if (domains.length) return domains[Math.floor(Math.random() * domains.length)];
  } catch (err) {
    console.log(`[TempMail] domain fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }
  return FALLBACK_DOMAINS[Math.floor(Math.random() * FALLBACK_DOMAINS.length)];
}

export async function generateTempMailAddress(): Promise<string> {
  return `${randomLocal()}@${await getRandomDomain()}`;
}

export async function pollTempMailAPI(
  emailAddress: string,
  workerId: number,
  maxRetries = 15,
  newerThan = new Date(Date.now() - 2 * 60 * 1000),
): Promise<string> {
  const [user, domain] = emailAddress.split('@');
  if (!user || !domain) throw new Error(`Invalid temp mail address: ${emailAddress}`);
  const url = `${TEMP_MAIL_BASE}/api/email/${encodeURIComponent(domain)}/${encodeURIComponent(user)}/?page=1&limit=100`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    getTui().updateWorker(workerId, `polling Tinyhost OTP (${attempt}/${maxRetries})...`);

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        console.log(`[TempMail] Tinyhost HTTP ${response.status}`);
        await sleep(3000);
        continue;
      }

      const data = await response.json() as Record<string, any>;
      const emails = Array.isArray(data?.emails) ? data.emails : [];
      console.log(`[TempMail] ${emailAddress} poll ${attempt}/${maxRetries}: ${emails.length} email(s)`);

      const xiaomiEmails = emails
        .filter((mail: any) => /xiaomi/i.test(`${mail.sender || ''} ${mail.subject || ''}`))
        .filter((mail: any) => {
          if (!mail.date) return true;
          const time = Date.parse(mail.date);
          return Number.isNaN(time) || time >= newerThan.getTime();
        })
        .sort((a: any, b: any) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0));

      for (const mail of xiaomiEmails) {
        const htmlContent: string = [mail.subject, mail.body, mail.html_body]
          .filter(Boolean)
          .join('\n');
        const normalized = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        const match = normalized.match(/verification code is\s*(\d{6})/i);
        if (match?.[1]) {
          console.log(`[TempMail] Xiaomi OTP found (${mail.date || 'no date'})`);
          return match[1];
        }
      }

      await sleep(3000);
    } catch (err) {
      console.log(`[TempMail] poll error: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(3000);
    }
  }

  throw new Error('Failed to retrieve OTP from Tinyhost after maximum retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
