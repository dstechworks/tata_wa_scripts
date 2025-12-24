@echo off

REM ===== SET PATHS =====
set BASE_DIR=D:\Drive-D\JavaScript-Folder\GITHUB\whatsapp-scripts\tata_wa_scripts\src\all_combined_plus_ibc
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

cd /d "%BASE_DIR%"

"C:\Program Files\nodejs\node.exe" ibc_automation.js >> "%LOG_FILE%" 2>&1

echo =============================== >> "%LOG_FILE%"
echo Finished at %date% %time% >> "%LOG_FILE%"
echo =============================== >> "%LOG_FILE%"
