const { delay } = require('../utils/helpers.js');
const { chromium } = require('playwright');
const { exec } = require('child_process');
const moment = require('moment-timezone');
const cron = require('node-cron');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

// ✅ Run the original logic exactly as-is
function runYourScript() {
    (async () => {
        try {
            // ✅ Save directly to ibc-backwall-daily-files folder
            const targetDir = path.join(__dirname, 'ibc-backwall-daily-files');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const browser = await chromium.launch({
                headless: false,
                executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                args: [
                    '--disable-infobars',
                    '--disable-password-manager-reauthentication',
                    '--disable-save-password-bubble',
                    '--disable-credential-manager',
                    '--disable-features=msEdgePasswordManager,msEdgePasswordLeakDetection,SafeBrowsing',
                    '--no-default-browser-check',
                    '--disable-extensions',
                    '--disable-sync',
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-notifications',
                    '--disable-popup-blocking'
                ]
            });

            const context = await browser.newContext({
                viewport: { width: 800, height: 600 },
                deviceScaleFactor: 0.5,
                acceptDownloads: true
            });

            const page = await context.newPage();

            // ✅ Fix: Remove trailing spaces in URL
            await page.goto('https://iads.ibccube.in/SSRT/app');

            // === LOGIN ===
            await page.waitForSelector('#account_id');
            await delay(1000);
            await page.fill('#account_id', 'IADS');
            await delay(1000);
            await page.fill('#user_id', 'rakesh');
            await delay(1000);
            await page.fill('#password', 'password');
            await delay(1000);
            await page.click('.button.active');
            console.log('✅ Login successful');

            // === Handle popup (just in case) ===
            try {
                const okBtn = page.locator('button', { hasText: 'OK' }).first();
                if (await okBtn.isVisible({ timeout: 5000 })) {
                    await okBtn.click();
                    console.log('✅ Popup dismissed');
                }
            } catch (e) {
                console.log('ℹ️ No popup detected');
            }

            // === MODULE SELECTION ===
            await page.waitForSelector('#moduleselected');
            await page.click('#moduleselected');
            await page.selectOption('#moduleselected', 'TRACKING');
            await delay(1000);
            await page.goto('https://iads.ibccube.in/SSRT/app');
            console.log('✅ Module selected');

            // === FILTERS ===
            await delay(2000);

            // Existing filters - keep unchanged
            await page.fill('#parrsit_status', 'active');
            await page.dispatchEvent('#parrsit_status', 'blur');
            await delay(500);
            console.log('✅ Status set to "active"');

            await page.fill('#parrsit_device', 'mi or bi');
            await page.dispatchEvent('#parrsit_device', 'blur');
            await delay(500);
            console.log('✅ Device filter applied');

            // === ADDITIONAL FILTER FIELDS ===
            // Text input fields - fill with empty string to clear any existing values
            const textFields = [
                'parrsit_site',
                'parrsit_code',
                'parrsit_reference code',
                'parrsit_wd code',
                'parrsit_landmark',
                'parrsit_district',
                'parrsit_branch',
                'parrsit_channel',
                'parrsit_ra color',
                'parrsit_orientation',
                'parrsit_ra type',
                'parrsit_media group',
                'parrsit_contact name',
                'parrsit_administrator name',
                'parrsit_category',
                'parrsit_type',
                'parrsit_city / town',
                'parrsit_address',
                'parrsit_device status',
                'parrsit_site status',
                'parrsit_support status',
                'parrsit_work type',
                'parrsit_work status',
                'parrsit_sort key',
                'parrsit_work update',
                'parrsit_site unique id',
                'parrsit_keywords',
                'parrsit_location search'
            ];

            for (const fieldId of textFields) {
                try {
                    // Handle IDs with spaces using attribute selector
                    const selector = fieldId.includes(' ') || fieldId.includes('/')
                        ? `[id="${fieldId}"]`
                        : `#${fieldId}`;
                    await page.fill(selector, '');
                    await page.dispatchEvent(selector, 'blur');
                    await delay(200);
                } catch (e) {
                    console.log(`⚠️ Could not fill field: ${fieldId}`);
                }
            }
            console.log('✅ All text filter fields cleared');

            // Dropdown fields
            try {
                await page.selectOption('#parrsit_select', 'all');
                await delay(200);
                console.log('✅ Select set to "all"');
            } catch (e) {
                console.log('⚠️ Could not set parrsit_select');
            }

            try {
                await page.selectOption('[id="parrsit_date search on"]', 'none');
                await delay(200);
                console.log('✅ Date search on set to "none"');
            } catch (e) {
                console.log('⚠️ Could not set parrsit_date search on');
            }

            // === DATE FROM (set to custom time) ===
            await page.click('#parrsit_from');
            await delay(4000);
            await page.click('.ui-datepicker-buttonpane .ui-datepicker-current');
            await delay(2000);
            await page.click('.ui-datepicker-buttonpane .ui-datepicker-current');
            await delay(3000);

            // Adjust hour slider
            const hourHandle = await page.locator('.ui_tpicker_hour_slider .ui-slider-handle').first();
            await hourHandle.hover();
            await page.mouse.down();
            await page.mouse.move(150, 0, { steps: 20 });
            await page.mouse.up();
            await delay(3000);

            // Adjust minute slider
            const minuteHandle = await page.locator('.ui_tpicker_minute_slider .ui-slider-handle').first();
            await minuteHandle.hover();
            await page.mouse.down();
            await page.mouse.move(150, 0, { steps: 20 });
            await page.mouse.up();

            const timeText = await page.locator('.ui_tpicker_time').textContent();
            console.log('⏰ From time set to:', timeText);

            await page.click('.ui-datepicker-buttonpane .ui-datepicker-close');
            console.log('✅ Date From set');

            // === DATE TO (set to NOW + DONE) ===
            await page.click('#parrsit_to');
            await delay(2000);
            await page.click('.ui-datepicker-buttonpane .ui-datepicker-current'); // Now
            await delay(500);
            await page.click('.ui-datepicker-buttonpane .ui-datepicker-close');   // Done
            console.log('✅ Date To set to current time');

            // === OUTPUT TYPE ===
            await delay(5000);
            await page.selectOption('#parrsit_display', 'SUMMARY');
            await delay(5000);
            await page.selectOption('#parrsit_output', 'excel');
            console.log('✅ Output set to Excel');

            // === APPLY & DOWNLOAD ===
            await delay(5000);
            await page.getByRole('button', { name: 'Apply Date Filter' }).click();
            await delay(5000);
            console.log('🚀 Triggering download via "Display Activity"...');
            await page.getByRole('button', { name: 'Display Activity' }).click();

            // === WAIT FOR DOWNLOAD ===
            const download = await page.waitForEvent('download');
            const suggestedName = download.suggestedFilename() || 'report.xls';

            // ✅ Generate Kolkata-time-based filename
            const nowKolkata = moment().tz('Asia/Kolkata');
            const formattedName = `IADS_Report_${nowKolkata.format('DD-MM-YYYY-HH-mm A').replace(/ /g, '_')}.xlsx`;
            const finalPath = path.join(targetDir, formattedName);

            await download.saveAs(finalPath);
            console.log(`✅ File saved: ${finalPath}`);

            // === ⚡ REMOVE FIRST TWO ROWS FROM EXCEL FILE ===
            const workbook = XLSX.readFile(finalPath);
            const sheetName = workbook.SheetNames[0];
            let worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length >= 2) {
                const cleanedData = jsonData.slice(2); // Remove first two rows
                const newWorksheet = XLSX.utils.aoa_to_sheet(cleanedData);

                // Preserve column widths if they exist
                if (worksheet['!cols']) {
                    newWorksheet['!cols'] = worksheet['!cols'];
                }

                workbook.Sheets[sheetName] = newWorksheet;
                XLSX.writeFile(workbook, finalPath);
                console.log(`✅ First two rows removed. File updated: ${finalPath}`);
            } else {
                console.log('⚠️ File has fewer than 2 rows — nothing removed.');
            }

            await browser.close();
            console.log('🎉 Browser closed. Script completed!');

            // ✅ Run "npm run 1" in tata_wa_scripts folder
            const runScriptDir = path.join(__dirname, '..', '..');
            console.log(`🚀 Starting "npm run 1" in: ${runScriptDir}`);
            const child = exec('npm run 1', {
                cwd: runScriptDir,
                windowsHide: true, // 👈 Hides the console window on Windows
                shell: 'cmd.exe'
            });

            child.stdout.on('data', (data) => console.log(data));
            child.stderr.on('data', (data) => console.error('⚠️ Error from npm run 1:', data));
            child.on('close', (code) => {
                console.log(`✅ "npm run 1" finished with exit code: ${code}`);
                console.log(`🔄 Cron scheduler is still running. Waiting for next scheduled execution...`);
                // Don't exit - keep the process alive for cron jobs to continue running
            });
        } catch (error) {
            console.error('❌ Error in runYourScript:', error);
            // Don't exit - keep the process alive for cron jobs to continue running
        }
    })();
}

const TIMEZONE = 'Asia/Kolkata';

// Function to setup and start cron jobs
function startCronJobs() {
    // ✅ Mon–Sat @ 10:30 AM: Run IBC automation
    cron.schedule('30 10 * * 1-6', () => {
        console.log(`⏰ Executing IBC automation at Kolkata time: ${moment().tz(TIMEZONE).format("llll")}`);
        runYourScript();
    }, { timezone: TIMEZONE });

    // ✅ Mon–Sat @ 5:00 PM: Run IBC automation
    cron.schedule('0 17 * * 1-6', () => {
        console.log(`⏰ Executing IBC automation at Kolkata time: ${moment().tz(TIMEZONE).format("llll")}`);
        runYourScript();
    }, { timezone: TIMEZONE });

    const now = moment().tz(TIMEZONE);
    const currentHour = now.hour();
    const currentMinute = now.minute();
    const currentDay = now.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    let nextMorningRun = moment(now).tz(TIMEZONE);
    let nextEveningRun = moment(now).tz(TIMEZONE);

    // Calculate next morning run (10:30 AM)
    if (currentHour < 10 || (currentHour === 10 && currentMinute < 30)) {
        if (currentDay >= 1 && currentDay <= 6) { // Mon-Sat
            nextMorningRun.hour(10).minute(30).second(0);
        } else {
            nextMorningRun.add(1, 'day').hour(10).minute(30).second(0);
        }
    } else {
        if (currentDay === 6) {
            nextMorningRun.add(2, 'days').hour(10).minute(30).second(0);
        } else if (currentDay === 0) {
            nextMorningRun.add(1, 'day').hour(10).minute(30).second(0);
        } else {
            nextMorningRun.add(1, 'day').hour(10).minute(30).second(0);
        }
    }

    // Calculate next evening run (5:00 PM)
    if (currentHour < 17) {
        if (currentDay >= 1 && currentDay <= 6) { // Mon-Sat
            nextEveningRun.hour(17).minute(0).second(0);
        } else {
            nextEveningRun.add(1, 'day').hour(17).minute(0).second(0);
        }
    } else {
        if (currentDay === 6) {
            nextEveningRun.add(2, 'days').hour(17).minute(0).second(0);
        } else if (currentDay === 0) {
            nextEveningRun.add(1, 'day').hour(17).minute(0).second(0);
        } else {
            nextEveningRun.add(1, 'day').hour(17).minute(0).second(0);
        }
    }

    // Find the next upcoming run (whichever is sooner)
    const nextRun = nextMorningRun.isBefore(nextEveningRun) ? nextMorningRun : nextEveningRun;
    console.log(`⏰ Next scheduled run: ${nextRun.format('dddd, MMMM Do YYYY, hh:mm A')} (Kolkata time)`);
}

// Keep the process alive and handle errors gracefully
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit - keep cron jobs running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - keep cron jobs running
});

// Start cron jobs - Comment this line to disable cron scheduling
startCronJobs();

// Uncomment below to run script immediately (for testing)
// runYourScript();