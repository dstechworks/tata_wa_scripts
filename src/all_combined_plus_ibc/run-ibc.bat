@echo off

REM ===== SET PATHS =====
set BASE_DIR=G:\Drive-D\JavaScript-Folder\GITHUB\whatsapp-scripts\tata_wa_scripts\src\all_combined_plus_ibc
set LOG_DIR=%BASE_DIR%\all-combined-plus-ibc-logs

REM ===== CREATE LOG DIR IF NOT EXISTS =====
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM ===== DATE FORMAT (DD-MM-YYYY) =====
for /f "tokens=2 delims==." %%a in ('wmic os get localdatetime /value') do set dt=%%a
set LOG_DATE=%dt:~6,2%-%dt:~4,2%-%dt:~0,4%

set LOG_FILE=%LOG_DIR%\automation-log-%LOG_DATE%.log

REM ===== START LOGGING =====
echo =============================== >> "%LOG_FILE%"
echo Started at %date% %time% >> "%LOG_FILE%"
echo =============================== >> "%LOG_FILE%"

cd /d "%BASE_DIR%" || (
    echo ERROR: Failed to change directory to "%BASE_DIR%" >> "%LOG_FILE%"
    exit /b 1
)

REM ===== FIND NODE VIA PATH (NVM-compatible) =====
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found in PATH. NVM may not be initialized. >> "%LOG_FILE%"
    echo        Try running 'nvm use <version>' manually first. >> "%LOG_FILE%"
    echo        Current PATH: %PATH% >> "%LOG_FILE%"
    exit /b 1
)

REM ===== EXECUTE SCRIPT WITH ERROR HANDLING =====
node ibc_automation.js >> "%LOG_FILE%" 2>&1
set EXIT_CODE=%errorlevel%

echo =============================== >> "%LOG_FILE%"
if %EXIT_CODE% equ 0 (
    echo Finished successfully at %date% %time% (Exit code: %EXIT_CODE%) >> "%LOG_FILE%"
) else (
    echo Finished with errors at %date% %time% (Exit code: %EXIT_CODE%) >> "%LOG_FILE%"
)
echo =============================== >> "%LOG_FILE%"

exit /b %EXIT_CODE%