# Xiaomi MiMo API Key Generator

CLI automation bot that registers Xiaomi accounts for MiMo API Platform, verifies OTP via temp mail or Gmail IMAP, joins the invite flow, and stores generated API keys.

## Features

- **Xiaomi Registration**: Opens Xiaomi account registration for the MiMo API Platform callback flow.
- **Temp Mail Flow**: Creates temporary inboxes and polls OTP codes automatically.
- **Gmail IMAP Support**: Optional Gmail alias/IMAP OTP reader for reusable inbox setups.
- **MiMo Invite Flow**: Uses the configured invite code and continues into the MiMo console.
- **API Key Output**: Saves generated API keys to `output/success_keys.txt` using numbered `1. sk-xxxxx` format.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer.
- A Gmail account with **2FA enabled** and an **App Password** if using Gmail IMAP.
- A proxy is optional. The default path runs without one.

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/Rossevelt1313/MimoAuto.git
   cd MimoAuto
   ```

2. Install dependencies:
   ```bash
   npm ci
   ```

## Configuration

1. Copy the example environment file and configure it:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your details:
   - `GMAIL_USERNAME`: Your base Gmail address (e.g., `yourname@gmail.com`).
   - `GMAIL_APP_PASSWORD`: Your 16-character Gmail App Password. (Do NOT use your normal password. Generate one [here](https://myaccount.google.com/apppasswords)).
   - `HEADLESS`: Set to `true` to run invisibly, or `false` if you want to watch the browser work.
   - `MIMO_INVITE_CODE`: Optional MiMo invite code. Keep personal referral codes in `.env`, not source code.

3. (Optional) Add a proxy:
   Copy `proxy.txt.example` to `proxy.txt`, then add one proxy per line. Supported formats:
   - `socks5://user:pass@host:port`
   - `socks5://host:port`
   - `http://user:pass@host:port`
   - `user:pass@host:port`
   - `ip:port`
   - `ip:port:user:pass`

   At startup, choose whether the bot should use `proxy.txt`. The default is **No**. SOCKS5 authentication is bridged through a local HTTP proxy because Chromium does not support authenticated SOCKS5 directly. `ERR_TUNNEL_CONNECTION_FAILED` means the upstream proxy rejected or reset the tunnel; verify credentials, IP allowlisting, hostname support, protocol, and HTTPS access with the proxy provider.

## Usage

### Development Mode

To run the bot in development mode using `ts-node`:

```bash
npm run dev
```

### Production Mode

To build and run the compiled JavaScript:

```bash
npm run build
npm start
```

### Loop/CDP Mode

```bash
npm run cdp
```

If proxy use is enabled, each run launches a fresh proxied Chrome and rotates entries. Otherwise, the bot connects to Chrome on CDP port `9222`. See `CDP_QUICKSTART.md`.

## Output

- Generated API keys are saved to `output/success_keys.txt`.
- Failed runs are saved to `output/failed_accounts.csv`.

## Disclaimer

This project is for educational purposes only. Use responsibly and adhere to the terms of service of the targeted platforms.

## License

[MIT](LICENSE) — feel free to use, modify, and distribute.
