# CDP Mode - Quick Start (Windows)

## Option 1: Easy Way (Double-click)

1. **Double-click:** `start-chrome-debug.bat`
   - Chrome will open automatically
   - Port 9222 configured
   - Fresh random Chrome profile per launch

2. **Open Xiaomi MiMo registration tabs** in Chrome:
   - Open the Xiaomi register URL used by the MiMo API Platform callback flow
   - Solve any visible challenge in each tab

3. **Run automation:**
   ```bash
   npm run cdp
   ```

---

## Option 2: PowerShell

1. **Right-click:** `start-chrome-debug.ps1` → "Run with PowerShell"
   - Or: `powershell -ExecutionPolicy Bypass -File start-chrome-debug.ps1`

2. **Open Xiaomi MiMo registration tabs**

3. **Run:**
   ```bash
   npm run cdp
   ```

---

## Option 3: Manual (Full Path)

1. **Find Chrome path:**
   - Usually: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - Or: `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

2. **Run in CMD/PowerShell:**
   ```cmd
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\mimo-cdp-profile-%RANDOM%"
   ```

3. **Open Xiaomi MiMo registration tabs**

4. **Run:**
   ```bash
   npm run cdp
   ```

---

## Option 4: Using `where` command

1. **Find Chrome:**
   ```cmd
   where chrome
   ```

2. **If not found, add to PATH or use full path**

3. **Run Chrome:**
   ```cmd
   chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\mimo-cdp-profile-%RANDOM%"
   ```

---

## Troubleshooting

### "chrome.exe: command not found"

**Solution 1 (Easiest):** Use batch script
```cmd
start-chrome-debug.bat
```

**Solution 2:** Use full path
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Solution 3:** Add Chrome to PATH
```cmd
# Add to System PATH:
C:\Program Files\Google\Chrome\Application
```

### "Port 9222 already in use"

**Solution:**
```cmd
# Use a different CDP port or close only the old CDP Chrome window, then start again
start-chrome-debug.bat
```

### "Cannot connect to CDP"

**Check:**
1. Chrome is running
2. Started with `--remote-debugging-port=9222`
3. Visit: http://127.0.0.1:9222/json
   - Should show Chrome tabs list

---

## Verify CDP Working

Open browser and go to:
```
http://127.0.0.1:9222/json
```

Should see JSON output like:
```json
[
  {
    "description": "",
    "devtoolsFrontendUrl": "/devtools/...",
    "id": "...",
    "title": "Xiaomi Account Register",
    "type": "page",
    "url": "https://account.xiaomi.com/...",
    "webSocketDebuggerUrl": "ws://127.0.0.1:9222/..."
  }
]
```

If you see this, CDP is working.

---

## Quick Commands

```bash
# Easy start (Windows)
start-chrome-debug.bat

# Run CDP automation
npm run cdp

# Normal mode (if needed)
npm run dev
```

---

## Files You Need

- `start-chrome-debug.bat` - Windows batch script (double-click)
- `start-chrome-debug.ps1` - PowerShell script (alternative)
- `.env` - optional Gmail credentials and headless setting

---

## Ready?

1. Run: `start-chrome-debug.bat`
2. It opens a separate Chrome CDP profile without closing existing Chrome windows.
3. Run: `npm run cdp`
4. Watch the automation.
