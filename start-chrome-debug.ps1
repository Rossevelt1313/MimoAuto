# Start Chrome with Remote Debugging for CDP Mode
# Usage: Right-click > Run with PowerShell
#        Or: powershell -ExecutionPolicy Bypass -File start-chrome-debug.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Chrome Debug Mode" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find Chrome installation
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if (-not $chromePath) {
    Write-Host ""
    Write-Host "ERROR: Chrome not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Chrome or run manually:" -ForegroundColor Yellow
    Write-Host '"C:\Path\To\Chrome\chrome.exe" --remote-debugging-port=9222' -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Chrome found at: $chromePath" -ForegroundColor Green
Write-Host ""
Write-Host "Starting separate Chrome CDP profile on port 9222..." -ForegroundColor Gray
Write-Host ""

# Start Chrome with remote debugging
$profileDir = Join-Path $env:TEMP ("mimo-cdp-profile-{0}-{1}" -f (Get-Random), (Get-Random))
Write-Host "Profile: $profileDir" -ForegroundColor Gray
Start-Process -FilePath $chromePath -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$profileDir", "--no-first-run", "--no-default-browser-check"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Chrome Debug Mode Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for Chrome to open"
Write-Host "  2. Open Xiaomi MiMo registration page if needed"
Write-Host "  3. Run: npm run cdp"
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
