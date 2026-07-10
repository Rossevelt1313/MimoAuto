# MimoAuto

[![Build](https://github.com/Rossevelt1313/MimoAuto/actions/workflows/build.yml/badge.svg)](https://github.com/Rossevelt1313/MimoAuto/actions/workflows/build.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

MimoAuto is a TypeScript CLI for automating the Xiaomi MiMo account setup flow. It handles browser registration, email verification, optional invite redemption, and API key extraction through Playwright.

> This is an independent community project. It is not affiliated with, endorsed by, or maintained by Xiaomi.

## Features

- Xiaomi account registration through Playwright
- OTP retrieval from temporary mail or Gmail IMAP
- Standard browser mode and Chrome DevTools Protocol (CDP) mode
- Optional HTTP and SOCKS5 proxy support with per-run rotation
- Fresh browser context for each loop iteration
- Cryptographically random password generation
- Numbered API key output in `output/success_keys.txt`
- Minimal terminal status display

## How it works

```text
Create email
    |
Register Xiaomi account
    |
Retrieve and submit OTP
    |
Redeem invite code (optional)
    |
Create MiMo API key
    |
Save result locally
```

## Requirements

- Node.js 18 or newer
- npm
- Google Chrome for CDP mode
- Gmail with 2FA and an App Password only when using Gmail IMAP

## Installation

```bash
git clone https://github.com/Rossevelt1313/MimoAuto.git
cd MimoAuto
npm ci
```

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Windows Command Prompt:

```cmd
copy .env.example .env
```

Available settings:

| Variable | Required | Description |
| --- | --- | --- |
| `GMAIL_USERNAME` | Gmail mode only | Gmail address used to receive OTP messages |
| `GMAIL_APP_PASSWORD` | Gmail mode only | Google App Password, not the regular account password |
| `MIMO_INVITE_CODE` | No | MiMo invite code used during redemption |
| `HEADLESS` | No | Set to `true` to hide the browser in standard mode |

Keep real credentials in `.env`. The file is ignored by Git.

### Proxy configuration

Copy `proxy.txt.example` to `proxy.txt`, then place one proxy on each line. Supported formats:

```text
socks5://user:pass@host:port
socks5://host:port
http://user:pass@host:port
user:pass@host:port
ip:port
ip:port:user:pass
```

Proxy use is disabled by default and selected at startup. Authenticated SOCKS5 proxies are routed through a local HTTP bridge because Chromium does not support SOCKS5 authentication directly.

## Usage

### Standard mode

Run directly from TypeScript:

```bash
npm run dev
```

Or compile and run JavaScript:

```bash
npm run build
npm start
```

### CDP loop mode

Start a separate Chrome instance with remote debugging enabled:

```cmd
start-chrome-debug.bat
```

Then run:

```bash
npm run cdp
```

Without a proxy, MimoAuto connects to Chrome on port `9222`. With proxy mode enabled, it launches a fresh browser for every run and rotates entries from `proxy.txt`. See [CDP_QUICKSTART.md](CDP_QUICKSTART.md) for Windows setup and troubleshooting.

## Output

Runtime files stay inside `output/` and are excluded from Git.

| File | Contents |
| --- | --- |
| `output/success_keys.txt` | Numbered MiMo API keys |
| `output/failed_accounts.csv` | Failed email and error details |
| `output/otp-wait-timeout.png` | Debug screenshot when OTP entry times out |
| `output/mimo-console.png` | Debug screenshot when key extraction fails |

API keys and screenshots can contain sensitive account data. Store them securely and delete them when they are no longer needed.

## Security

- Account passwords are generated with Node.js `crypto.randomBytes()`.
- Passwords and OTP values are not written to terminal logs or result files.
- `.env`, `proxy.txt`, output files, screenshots, and build artifacts are ignored by Git.
- TLS certificate validation remains enabled for browser and email connections.

Never commit Gmail App Passwords, proxy credentials, generated API keys, or runtime screenshots.

## Project structure

```text
src/
  cdp-mode.ts     CDP loop entry point
  cdp.ts          Chrome CDP connection
  index.ts        Standard CLI entry point
  otp-reader.ts   Gmail IMAP OTP reader
  proxy.ts        Proxy parsing and SOCKS5 bridge
  temp-mail.ts    Temporary inbox integration
  tui.ts          Terminal status display
  worker.ts       Registration and API key workflow
```

## Troubleshooting

### CDP connection refused

Start Chrome before running `npm run cdp`:

```cmd
start-chrome-debug.bat
```

Confirm that `http://127.0.0.1:9222/json/version` returns JSON.

### Proxy tunnel failure

`ERR_TUNNEL_CONNECTION_FAILED` usually means the upstream proxy rejected the connection. Verify its protocol, credentials, IP allowlist, hostname support, and HTTPS access.

### Gmail OTP not found

Confirm that IMAP access is available, 2FA is enabled, and `GMAIL_APP_PASSWORD` contains a valid Google App Password.

## Responsible use

Use this project only on accounts and systems you are authorized to access. Automated registration may be restricted by platform terms, rate limits, or abuse controls. You are responsible for complying with applicable terms and laws.

## License

Distributed under the [MIT License](LICENSE).
