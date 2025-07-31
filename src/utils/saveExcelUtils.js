const moment = require('moment-timezone');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

const saveDataToExcel = async (data, folderPath) => {
    try {
        // Ensure the folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        const formattedDate = moment().tz('Asia/Kolkata').format('DD-MMM-YYYY-hhA');
        const fileName = `${formattedDate}.xlsx`;
        const filePath = path.join(folderPath, fileName);

        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
        xlsx.writeFile(wb, filePath);
        console.log("\n");
        console.log(`EXCEL FILE SAVED :: ${fileName}`);
    } catch (error) {
        console.error("Error saving data to Excel file:", error);
    }
};

module.exports = { saveDataToExcel };