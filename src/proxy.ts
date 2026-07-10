import fs from 'fs';
import path from 'path';
import { anonymizeProxy } from 'proxy-chain';

export interface ProxyConfig {
  ip: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'socks5';
}

/**
 * Load proxies from proxy.txt in project root.
 * Supports formats:
 *   socks5://ip:port
 *   socks5://user:pass@ip:port
 *   http://ip:port
 *   http://user:pass@ip:port
 *   ip:port                    (unauthenticated socks5)
 *   ip:port:user:pass          (authenticated socks5, legacy)
 *   user:pass@host:port        (authenticated socks5, new)
 */
export function loadProxies(): ProxyConfig[] {
  const filePath = path.resolve(process.cwd(), 'proxy.txt');
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const proxies: ProxyConfig[] = [];

  for (const line of lines) {
    if (line.startsWith('#')) continue;

    // socks5://user:pass@ip:port or http://user:pass@ip:port
    const protoMatch = line.match(/^(socks5|https?):\/\/(.+)$/i);
    if (protoMatch) {
      const protocol = protoMatch[1].toLowerCase() === 'socks5' ? 'socks5' : 'http';
      const rest = protoMatch[2];
      const atIdx = rest.lastIndexOf('@');
      if (atIdx >= 0) {
        const creds = rest.substring(0, atIdx);
        const hostPort = rest.substring(atIdx + 1);
        const colonIdx = creds.indexOf(':');
        const username = colonIdx >= 0 ? creds.substring(0, colonIdx) : creds;
        const password = colonIdx >= 0 ? creds.substring(colonIdx + 1) : '';
        const [host, portStr] = hostPort.split(':');
        const port = parseInt(portStr, 10);
        if (!isNaN(port)) proxies.push({ ip: host, port, username, password, protocol });
      } else {
        const [host, portStr] = rest.split(':');
        const port = parseInt(portStr, 10);
        if (!isNaN(port)) proxies.push({ ip: host, port, protocol });
      }
      continue;
    }

    // ip:port:user:pass (legacy, assume socks5)
    const colonParts = line.split(':');
    if (colonParts.length >= 4 && /^\d+\.\d+\.\d+\.\d+$/.test(colonParts[0]) && /^\d+$/.test(colonParts[1])) {
      const host = colonParts[0];
      const port = parseInt(colonParts[1], 10);
      const username = colonParts[2];
      const password = colonParts.slice(3).join(':');
      proxies.push({ ip: host, port, username, password, protocol: 'socks5' });
      continue;
    }

    // user:pass@host:port (assume socks5)
    if (line.includes('@')) {
      const atIdx = line.lastIndexOf('@');
      const credentials = line.substring(0, atIdx);
      const hostPort = line.substring(atIdx + 1);
      const colonIdx = credentials.indexOf(':');
      if (colonIdx < 0) continue;
      const username = credentials.substring(0, colonIdx);
      const password = credentials.substring(colonIdx + 1);
      const [host, portStr] = hostPort.split(':');
      const port = parseInt(portStr, 10);
      if (isNaN(port)) continue;
      proxies.push({ ip: host, port, username, password, protocol: 'socks5' });
      continue;
    }

    // ip:port (unauthenticated socks5)
    if (colonParts.length === 2) {
      const port = parseInt(colonParts[1], 10);
      if (isNaN(port)) continue;
      proxies.push({ ip: colonParts[0], port, protocol: 'socks5' });
    }
  }

  return proxies;
}

export function getProxyByIndex(proxies: ProxyConfig[], index: number): ProxyConfig | undefined {
  if (proxies.length === 0) return undefined;
  return proxies[index % proxies.length];
}

export function proxyToString(proxy?: ProxyConfig): string {
  if (!proxy) return 'none';
  return `${proxy.protocol}://${proxy.ip}:${proxy.port}`;
}

/**
 * Build a Playwright-compatible proxy object.
 * For SOCKS5 with auth: creates a local HTTP tunnel via proxy-chain.
 * Returns { server, username?, password?, _localUrl? }
 */
export async function buildPlaywrightProxy(proxy: ProxyConfig): Promise<{ server: string; username?: string; password?: string; localUrl?: string }> {
  if (proxy.protocol === 'http') {
    const server = `http://${proxy.ip}:${proxy.port}`;
    return { server, username: proxy.username, password: proxy.password };
  }

  // SOCKS5 without auth → Chromium handles it fine
  if (!proxy.username) {
    return { server: `socks5://${proxy.ip}:${proxy.port}` };
  }

  // SOCKS5 with auth → proxy-chain bridge
  const socksUrl = `socks5://${encodeURIComponent(proxy.username!)}:${encodeURIComponent(proxy.password!)}@${proxy.ip}:${proxy.port}`;
  const localUrl = await anonymizeProxy(socksUrl);
  console.log(`[proxy] SOCKS5 bridge: ${proxy.ip}:${proxy.port} → ${localUrl}`);
  return { server: localUrl, localUrl };
}
