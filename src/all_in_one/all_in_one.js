const { firefox } = require('playwright');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

puppeteer.use(StealthPlugin());

function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

(async () => {
    const deleteExcelFilesInDirectory = () => {
        const directoryPath = path.join(__dirname, 'excel');
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                console.error('Error reading directory:', err);
                return;
            }
            files.forEach((file) => {
                const filePath = path.join(directoryPath, file);
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                        return;
                    }
                    console.log('File deleted successfully:', filePath);
                });
            });
        });
    };

    // await deleteExcelFilesInDirectory();

    // Launch the browser and open a new blank page
    const browser = await firefox.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-http2',
        ],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    );

    await page.goto('https://iads.ibccube.in/SSRT/app', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Set screen size
    // await page.setViewport({ width: 1080, height: 1600 });
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 0.5 });

    // Type into login page
    await page.waitForSelector('#account_id');
    await delay(1000);
    await page.type('#account_id', 'IADS');
    await delay(1000);
    await page.type('#user_id', 'rakesh');
    await delay(1000);
    await page.type('#password', 'password');
    await delay(1000);
    await page.click('.button.active');

    console.log('Login successful');    

    await page.waitForSelector('#moduleselected');
    await page.click('body');
    await page.click('#moduleselected');
    await page.select('#moduleselected', 'TRACKING');
    await delay(1000);
    await page.goto('https://iads.ibccube.in/SSRT/app');

    console.log('Navigated to the app');

    await delay(2000);
    await page.waitForSelector('#parrsit_status');
    await page.$eval('#parrsit_status', input => input.value = '');
    await page.type('#parrsit_status', 'active');

    console.log('Status set to active');

    await delay(2000);
    await page.waitForSelector('#parrsit_device');
    await page.$eval('#parrsit_device', input => input.value = '');
    await page.type('#parrsit_device', 'mi or bi');

    console.log('Device set to mi or bi');

    await delay(2000);
    await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('title'));
        const targeTitle = titles.find(button => button.textContent.trim() === "Device: ");
        if (targeTitle) {
            targeTitle.click();
        }
    });

    console.log('Device clicked');

    await delay(5000);





    //============================= date from ==================================//
    // Click on the input field to open the datepicker
    await page.waitForSelector('#parrsit_from');
    await page.click('#parrsit_from');

    console.log('Date from clicked');

    await delay(2000);
    await page.waitForSelector('.ui-datepicker-buttonpane .ui-datepicker-current');
    await page.click('.ui-datepicker-buttonpane .ui-datepicker-current');

    await delay(2000);
    // Wait for the datepicker to appear
    await page.waitForSelector('#ui-datepicker-div');
    await page.waitForSelector('.ui_tpicker_hour_slider');

    await page.click('.ui-datepicker-buttonpane .ui-datepicker-current');
    // await page.click('.ui-datepicker-buttonpane .ui-datepicker-close');

    await delay(3000)

    // Wait for the slider handle to be visible
    await page.waitForSelector('.ui_tpicker_hour_slider .ui-slider-handle');

    // Find the slider element
    const sliderHandle1 = await page.$('.ui_tpicker_hour_slider .ui-slider-handle');

    // Move the slider to the left or right (adjust the distance based on your requirements)
    await sliderHandle1.hover();
    await page.mouse.down();
    await page.mouse.move(150, 0, { steps: 20 }); // Adjust the value as needed
    await page.mouse.up();

    await delay(3000)

    // Find the slider element
    const sliderHandle2 = await page.$('.ui_tpicker_minute_slider .ui-slider-handle');

    await sliderHandle2.click();

    // Move the slider to the left or right (adjust the distance based on your requirements)
    await sliderHandle2.hover();
    await page.mouse.down();
    await page.mouse.move(150, 0, { steps: 20 }); // Adjust the value as needed
    await page.mouse.up();
    //  await sliderHandle2.asElement().drag({ x: 150, y: 0 });

    await page.waitForSelector('.ui_tpicker_time');

    const readingValue = await page.$eval('.ui_tpicker_time', (element) => element.innerText);
    console.log('Current reading:', readingValue);

    await delay(3000)

    await page.waitForSelector('.ui-datepicker-buttonpane .ui-datepicker-close');
    await page.click('.ui-datepicker-buttonpane .ui-datepicker-close');
    await delay(3000);
    //============================= date from ==================================//






    //============================== date to ===================================//
    await page.waitForSelector('#parrsit_to');
    await page.click('#parrsit_to');

    console.log('Date to clicked');

    await delay(5000);
    // Wait for the datepicker to appear
    await page.waitForSelector('#ui-datepicker-div');
    await page.waitForSelector('.ui_tpicker_minute_slider');
    await page.waitForSelector('.ui-datepicker-buttonpane .ui-datepicker-current');
    await page.click('.ui-datepicker-buttonpane .ui-datepicker-current');
    await delay(2000)
    await page.waitForSelector('.ui-datepicker-buttonpane .ui-datepicker-close');
    await page.click('.ui-datepicker-buttonpane .ui-datepicker-close');

    await delay(5000);
    await page.waitForSelector('#parrsit_display');
    await page.click('#parrsit_display');
    await page.select('#parrsit_display', 'SUMMARY');

    await delay(5000);
    await page.waitForSelector('#parrsit_output');
    await page.click('#parrsit_output');
    await page.select('#parrsit_output', 'excel');
    //============================== date to ===================================//





    await delay(5000);
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const targetButton = buttons.find(button => button.textContent.trim() === "Apply Date Filter");
        if (targetButton) {
            targetButton.click();
        }
    });

    console.log('Apply Date Filter clicked');

    await delay(5000);
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const targetButton = buttons.find(button => button.textContent.trim() === "Display Activity");
        if (targetButton) {
            targetButton.click();
        }
    });

    console.log('Display Activity clicked');

    return;

    // Wait for some action to complete (if necessary)
    await page.waitForTimeout(3000);

    await delay(300000);
    await page.waitForSelector('.formsearch[type="submit"]');
    const searchBtn = await page.$('.button.formsearch[type="submit"]');
    await searchBtn.hover();
    await page.click('.button.formsearch[type="submit"]');

    await delay(2000);

    await page.waitForSelector('button.button.linknormal');
    await page.click('a[href="/SSRT/app?function=report&target=SITE-ACTIVITY"]');

    await page.waitForSelector('table');

    // await delay(5000);


    // Wait for navigation to complete
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    // Listen for the request event
    page.on('request', request => {
        if (request.resourceType() === 'document' && request.method() === 'GET') {
            // Check if the URL matches the one you expect for downloading the document
            const url = request.url();
            if (url.includes('SSRT/app?function=report&target=SITE-ACTIVITY')) {
                console.log('Downloading document:', url);
            }
        }
    });
    // await page.waitForSelector('table');

    function tableToJson(table) {
        var data = [];

        // Remove the first two rows from the thead
        table.querySelector('thead tr:nth-child(1)').remove();
        table.querySelector('thead tr:nth-child(1)').remove();

        // first row needs to be headers
        var headers = [];
        for (var i = 0; i < table.rows[0].cells.length; i++) {
            headers[i] = table.rows[0].cells[i].textContent.toLowerCase().replace(/ /gi, '');
        }

        // go through cells
        for (var i = 1; i < table.rows.length; i++) {
            var tableRow = table.rows[i];
            var rowData = {};

            for (var j = 0; j < tableRow.cells.length; j++) {
                rowData[headers[j]] = tableRow.cells[j].textContent;
            }

            data.push(rowData);
        }

        return data;
    }

    function exportToExcel(jsonData, fileName) {
        var worksheet = XLSX.utils.json_to_sheet(jsonData);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, fileName + '.xlsx');
    }

    // Extract table data
    await page.evaluate(() => {
        var table = document.querySelector('table');
        var jsonData = tableToJson(table);
        exportToExcel(jsonData, 'output');

        // Filter out the first two rows
        // const filteredRows = rows.slice(2);

        // // Map each row to an array of its cell values
        // const data = filteredRows.map(row => {
        //     return Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim());
        // });

        // // Convert the data into CSV format
        // let csvData = data.map(row => row.join(','));
        // csvData = csvData.join('\n');

        // fs.writeFileSync('table_data.csv', tableData());
    });

    // Save the CSV data to a file

    console.log('Table data saved to table_data.csv');

    // await browser.close();
})();