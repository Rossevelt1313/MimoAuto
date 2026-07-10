@echo off
REM Start a separate Chrome profile with Remote Debugging for CDP Mode.
REM Does NOT close your existing Chrome windows.

echo.
echo ========================================
echo   Starting Chrome Debug Mode
echo ========================================
echo.

set CHROME_PATH=""

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
    goto :found
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    goto :found
)

if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
    goto :found
)

:notfound
echo.
echo ERROR: Chrome not found!
echo.
echo Please install Chrome or run manually:
echo "C:\Path\To\Chrome\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-cdp-profile"
echo.
pause
exit /b 1

:found
echo Chrome found at: %CHROME_PATH%
echo.
set PROFILE_DIR=%TEMP%\mimo-cdp-profile-%RANDOM%-%RANDOM%

echo Starting separate Chrome CDP profile on port 9222...
echo Profile: %PROFILE_DIR%
echo.

start "" %CHROME_PATH% --remote-debugging-port=9222 --user-data-dir="%PROFILE_DIR%" --no-first-run --no-default-browser-check "https://account.xiaomi.com/fe/service/register?_group=DEFAULT&_sign=iV9Q5kxBqXGdbkb6kmapXvJrkZM%%3D&serviceParam=%%7B%%22checkSafePhone%%22%%3Afalse%%2C%%22checkSafeAddress%%22%%3Afalse%%2C%%22lsrp_score%%22%%3A0.0%%7D&showActiveX=false&theme=&needTheme=false&bizDeviceType=&_locale=en&source=&region=&sid=api-platform&qs=%%253Fcallback%%253Dhttps%%25253A%%25252F%%25252Fplatform.xiaomimimo.com%%25252Fsts%%25253Fsign%%25253DM7gfywevl3CG5YTTcZDifhK6IK8%%2525253D%%252526followup%%25253Dhttps%%2525253A%%2525252F%%2525252Fplatform.xiaomimimo.com%%2525252Fconsole%%2525252Fbalance%%2526sid%%253Dapi-platform&callback=https%%3A%%2F%%2Fplatform.xiaomimimo.com%%2Fsts%%3Fsign%%3DM7gfywevl3CG5YTTcZDifhK6IK8%%253D%%26followup%%3Dhttps%%253A%%252F%%252Fplatform.xiaomimimo.com%%252Fconsole%%252Fbalance&_uRegion="

echo.
echo ========================================
echo   Chrome CDP Started
echo ========================================
echo.
echo Existing Chrome windows were NOT closed.
echo Run: npm run cdp
echo.
pause
