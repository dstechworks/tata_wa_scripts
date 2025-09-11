const { firefox } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

(async () => {
  // === Delete old Excel files ===
  const deleteExcelFilesInDirectory = () => {
    const directoryPath = path.join(__dirname, 'excel');
    if (!fs.existsSync(directoryPath)) return;
    fs.readdirSync(directoryPath).forEach((file) => {
      const filePath = path.join(directoryPath, file);
      fs.unlinkSync(filePath);
      console.log('🗑️ Deleted old file:', filePath);
    });
  };
  // deleteExcelFilesInDirectory();

  // === Launch Firefox ===
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 800, height: 600, deviceScaleFactor: 0.5 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0', // mimic real browser
  });
  const page = await context.newPage();

  // === Login ===
  await page.goto('https://iads.ibccube.in/SSRT/app', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await page.fill('#account_id', 'IADS');
  await page.fill('#user_id', 'rakesh');
  await page.fill('#password', 'password');
  await page.click('.button.active');

  console.log('✅ Login successful');

  // === Select module ===
  await page.waitForSelector('#moduleselected');
  await page.selectOption('#moduleselected', 'TRACKING');
  await delay(1000);
  await page.goto('https://iads.ibccube.in/SSRT/app');
  console.log('✅ Navigated to app');

  // === Filters ===
  await page.fill('#parrsit_status', 'active');
  await page.fill('#parrsit_device', 'mi or bi');
  console.log('✅ Filters applied');

  // === Date From ===
  await page.click('#parrsit_from');
  await delay(2000);
  await page.click('.ui-datepicker-buttonpane .ui-datepicker-current');
  await delay(2000);

  // Adjust time slider (hour)
  const sliderHour = await page.$('.ui_tpicker_hour_slider .ui-slider-handle');
  if (sliderHour) {
    const box = await sliderHour.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y, { steps: 20 });
    await page.mouse.up();
  }

  // Adjust time slider (minute)
  const sliderMin = await page.$('.ui_tpicker_minute_slider .ui-slider-handle');
  if (sliderMin) {
    const box = await sliderMin.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y, { steps: 20 });
    await page.mouse.up();
  }

  const readingValue = await page.textContent('.ui_tpicker_time');
  console.log('⏰ Current reading:', readingValue);

  await page.click('.ui-datepicker-buttonpane .ui-datepicker-close');

  // === Date To ===
  await page.click('#parrsit_to');
  await delay(2000);
  await page.click('.ui-datepicker-buttonpane .ui-datepicker-current');
  await delay(2000);
  await page.click('.ui-datepicker-buttonpane .ui-datepicker-close');
  console.log('✅ Date range set');

  // === Display & Output ===
  await page.selectOption('#parrsit_display', 'SUMMARY');
  await page.selectOption('#parrsit_output', 'excel');

  // === Apply Filters ===
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Apply Date Filter'
    );
    btn?.click();
  });
  await delay(2000);

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Display Activity'
    );
    btn?.click();
  });
  console.log('✅ Applied Date Filter & Display Activity');

  // === Wait for table ===
  await page.waitForSelector('table');

  // === Extract Table ===
  const tableData = await page.evaluate(() => {
    function tableToJson(table) {
      const data = [];
      const headers = [];

      // Get headers
      for (let i = 0; i < table.rows[0].cells.length; i++) {
        headers[i] = table.rows[0].cells[i].textContent
          .toLowerCase()
          .replace(/ /g, '');
      }

      // Get rows
      for (let i = 1; i < table.rows.length; i++) {
        const row = table.rows[i];
        const rowData = {};
        for (let j = 0; j < row.cells.length; j++) {
          rowData[headers[j]] = row.cells[j].textContent.trim();
        }
        data.push(rowData);
      }
      return data;
    }

    const table = document.querySelector('table');
    return table ? tableToJson(table) : [];
  });

  console.log(`📊 Extracted ${tableData.length} rows`);

  // === Export to Excel ===
  if (!fs.existsSync('excel')) fs.mkdirSync('excel');
  const fileName = `excel/output_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, fileName);

  console.log(`✅ Data exported to ${fileName}`);

  await browser.close();
})();
