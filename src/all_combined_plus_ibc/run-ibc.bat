@echo off

REM ===== SET PATHS =====
set "BASE_DIR=G:\Drive-D\JavaScript-Folder\GITHUB\whatsapp-scripts\tata_wa_scripts\src\all_combined_plus_ibc"
set "LOG_DIR=%BASE_DIR%\all-combined-plus-ibc-logs"

REM ===== CREATE LOG DIR IF NOT EXISTS =====
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM ===== DATE+TIME FOR UNIQUE LOG FILE =====
for /f "tokens=2 delims==." %%a in ('wmic os get localdatetime /value') do set dt=%%a
set "LOG_DATE=%dt:~6,2%-%dt:~4,2%-%dt:~0,4%"
set "LOG_TIME=%dt:~8,2%%dt:~10,2%%dt:~12,2%"

set "LOG_FILE=%LOG_DIR%\automation-log-%LOG_DATE%_%LOG_TIME%.log"

REM ===== START LOGGING =====
echo =============================== >> "%LOG_FILE%"
echo Started at %date% %time% >> "%LOG_FILE%"
echo =============================== >> "%LOG_FILE%"

REM ===== ADD NODE TO PATH (NVM + system fallback) =====
set "PATH=C:\nvm4w\nodejs;C:\Program Files\nodejs;%PATH%"

REM ===== CHANGE DIRECTORY =====
cd /d "%BASE_DIR%"
if errorlevel 1 (
    echo ERROR: Failed to change directory to %BASE_DIR% >> "%LOG_FILE%"
    goto :fail
)

REM ===== CHECK NODE =====
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found in PATH >> "%LOG_FILE%"
    goto :fail
)

REM ===== EXECUTE SCRIPT =====
node ibc_automation.js >> "%LOG_FILE%" 2>&1
set EXIT_CODE=%errorlevel%

echo =============================== >> "%LOG_FILE%"
if %EXIT_CODE% equ 0 (
    echo Finished successfully at %date% %time% >> "%LOG_FILE%"
) else (
    echo Finished with errors at %date% %time% >> "%LOG_FILE%"
)
echo =============================== >> "%LOG_FILE%"
exit /b %EXIT_CODE%

:fail
echo =============================== >> "%LOG_FILE%"
echo Finished with errors at %date% %time% >> "%LOG_FILE%"
echo =============================== >> "%LOG_FILE%"
echo.
echo FAILED - check log at: %LOG_FILE%
echo.
pause
exit /b 1
