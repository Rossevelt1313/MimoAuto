import imaps from 'imap-simple';

const IMAP_CONFIG: imaps.ImapSimpleOptions = {
  imap: { user: '', password: '', host: 'imap.gmail.com', port: 993, tls: true, authTimeout: 20000 },
};

export interface OtpResult { code: string | null; rawBody?: string; }

function normalizeAlias(address: string): string {
  const lower = address.match(/<?([^<>\s,]+@[^<>\s,]+)>?/)?.[1]?.toLowerCase() || '';
  const parts = lower.split('@');
  if (parts.length !== 2) return '';
  return parts[0].replace(/\./g, '') + '@' + parts[1];
}

export async function fetchOtp(username: string, appPassword: string, currentDotEmail: string): Promise<OtpResult> {
  const config: imaps.ImapSimpleOptions = {
    imap: { ...IMAP_CONFIG.imap, user: username, password: appPassword },
  };

  const connection = await imaps.connect(config);
  try {
    await connection.openBox('INBOX');
    // Only search recent unread emails (last 10 min)
    const searchCrit: any[] = [['SINCE', new Date(Date.now() - 10 * 60 * 1000)]];
    const messages = await connection.search(searchCrit, { bodies: ['HEADER', 'TEXT'], markSeen: false });
    console.log('[IMAP] Found ' + messages.length + ' recent messages for ' + currentDotEmail);

    const aliasNorm = normalizeAlias(currentDotEmail);

    // Sort newest first
    const sorted = messages.sort((a: any, b: any) => (b.attributes?.uid || 0) - (a.attributes?.uid || 0));

    for (const msg of sorted) {
      const headerPart = msg.parts.find((p: any) => (typeof p.which === 'string') && p.which.toUpperCase().includes('HEADER'));
      const textPart = msg.parts.find((p: any) => (typeof p.which === 'string') && p.which.toUpperCase().includes('TEXT'));
      const headers = typeof headerPart?.body === 'string' ? headerPart.body : '';
      const rawBody = typeof textPart?.body === 'string' ? textPart.body : '';

      // Clean HTML and combine
      const clean = (rawBody as string).replace(/=\r?\n/g, '').replace(/<[^>]*>/gm, ' ');
      const combined = headers + '\n' + clean;

      const isXiaomi = /xiaomi|verification code|verify your email|OTP/i.test(combined);
      const toHeader = /To:\s*(.*)/i.exec(headers)?.[1] || '';
      const toNorm = normalizeAlias(toHeader);
      const matchesAlias = Boolean(toNorm && aliasNorm && toNorm === aliasNorm);

      // Only process if matches alias AND is Xiaomi email
      if (matchesAlias && isXiaomi) {
        const match = clean.match(/\b(\d{6})\b/);
        if (match) {
          console.log('[IMAP] OTP found');
          return { code: match[1] };
        }
      }
    }
    return { code: null };
  } finally {
    try { await connection.end(); } catch {}
  }
}

export async function pollForOtp(username: string, appPassword: string, currentDotEmail: string, maxAttempts = 15, intervalMs = 3000): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log('[IMAP] Poll ' + attempt + '/' + maxAttempts);
    const result = await fetchOtp(username, appPassword, currentDotEmail);
    if (result.code) return result.code;
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('OTP not found after ' + maxAttempts + ' attempts');
}
