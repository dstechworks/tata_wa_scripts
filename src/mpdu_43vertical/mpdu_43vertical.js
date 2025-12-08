const { mpduNationalMsg, mpduBranchMsg, vertical43InchNationalMsg, vertical43InchBranchMsg } = require('../utils/whatsappMsgTempUtils');
const { mpduBranchWisePOCNum } = require('../utils/constants');
const { delay } = require('../utils/helpers');
const querystring = require('querystring');
const moment = require('moment-timezone');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { Pool } = require('pg');
const axios = require('axios');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
    user: "postgres",
    host: 'db.mgampbhmlnalxohuobpr.supabase.co',
    database: "postgres",
    password: 'gplVhDuxLDMeBKxs',
    port: 5432,
});

// Logger Intialize
const logger = require('./mpdu_43vertical_logger');

let workbookData = {};

// GOOGLE API VARIABLES
const spreadsheetId = "17ADQ1OvzA2KhHe1TG5eoCdFDqkHFiumuwIdy9jQ3s2M";

// dates variables
const previousDate = moment().tz("Asia/Kolkata").subtract(1, 'day');
const currentTime = moment().tz("Asia/Kolkata");

// server 1
const apiUrlServer1 = 'http://139.59.57.237/api';
const tokenEndpointServer1 = 'http://139.59.57.237/api/authorize/access_token';
const clientIDServer1 = '7c56c3b5e6b350293b8ef2eeea12a17ef66a7e49';
const clientSecretServer1 = '84d326acc305e908651ebec93d1a3b80ce4fadbb062746309949e75096face87bcd6b31312830c0492829f69288e3ed7e92d30171b6400c6abdc56eb519f547d069697afcbda138228eb577811cab83e2649586e67d6adf953d6976acc04055916c2d843bd94a99e5323a72b9acd855ee42113201faa73b689a91c798232c0';
// server 2
const apiUrlServer2 = 'https://xtravu.techworksworld.com/api';
const tokenEndpointServer2 = 'https://xtravu.techworksworld.com/api/authorize/access_token';
const clientIDServer2 = '211be598492d581012293b765540fb9283df26a5';
const clientSecretServer2 = '3033523b4a6673d3b676c63dfd2b486f09296fde96b9b8f5ba5d3c8c9bb9dc22b586a2875a7c606dc1aa6e63b56056133172521d49b3987470206f4f0fb6089f6df7d6a6b46c879d2f7ec90de943c42f3edbe0f4753e1ac83edcc62bb119644b9a16da7fc8b210238df2b2b620bf31e9742923fcd216aa8d8afc048969c2b2';


const tokenStorage = {
    server1: null,
    server2: null
};
let NationalPOCNum = {
    "Hitesh": "8700685675",
    "Dhruv": "8826909378",
    "Sandip": "9319798915",
    "Rusum": "9266903108",
    "Mark": "7871419732",
    "Rohan": "9888311338"
}
let eveningBranchNum = {
    "Hitesh": "8700685675",
    "Dhruv": "8826909378",
    "Sandip": "9319798915",
    "Rusum": "9266903108",
    "Rohan": "9888311338"
}

// =================================================================================================
// GENERIC HELPER FUNCTIONS
// =================================================================================================
const getUniqueByKey = (array, key) => {
    return [...new Set(array.map(item => item[key]))];
};

function isEmpty(value) {
    if (value === null || value === undefined || (typeof value === "number" && isNaN(value))) {
        return true;
    }
    if (typeof value === "string" && value.trim() === "") {
        return true;
    }
    if (Array.isArray(value) && value.length === 0) {
        return true;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
        return Object.keys(value).length === 0;
    }
    return false;
}

// Helper function to check if all branches are 0 (Active) / 0 (Inactive)
function allBranchesZero(dataStore, branchList) {
    return branchList.every(branch => {
        const b = dataStore[branch];
        return (!b || ((b.active === 0 || b.active === undefined) && (b.inactive === 0 || b.inactive === undefined)));
    });
}

// =================================================================================================
// COMMON CALCULATION FUNCTIONS
// =================================================================================================

// Common function to calculate device counts from API data
function calculateDeviceCounts(sheetName, apiData, targetBranches = null, statusFilter = 'Verified & Currently Installed') {
    let dataStoreArray = [{ "national": { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0 } }];

    if (!workbookData[sheetName] || workbookData[sheetName].length === 0 || apiData.length === 0) {
        return dataStoreArray;
    }

    const uniqueBranchCodes = getUniqueByKey(workbookData[sheetName], 'Branch Code');
    const branchesToProcess = targetBranches || uniqueBranchCodes;

    // Initialize branch data
    branchesToProcess.forEach(branch => {
        if (uniqueBranchCodes.includes(branch)) {
            dataStoreArray[0][branch] = { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0, "inActiveOutletList": "", "tempClosedOutletList": "" };
        }
    });

    // Count active/inactive - Use provided status filter
    workbookData[sheetName].forEach(deviceIdElement => {
        const currentStatus = deviceIdElement['Current Status'];
        const branchCode = deviceIdElement['Branch Code'];

        // Only count devices with the specified status for active/inactive/total
        if ((targetBranches ? targetBranches.includes(branchCode) : true) && currentStatus === statusFilter) {
            const findDeviceByTechworksId = apiData.find(d => d.display == deviceIdElement['Techworks ID']);

            if (findDeviceByTechworksId) {
                const onlineDevice = apiData.find(d =>
                    d.display.replace(/\s*(\(new\)|\t)\s*/gi, '') == deviceIdElement['Techworks ID'] && d.loggedIn == 1
                );
                const outletName = deviceIdElement['Outlet Name']?.trim();

                if (onlineDevice) {
                    dataStoreArray[0][branchCode].active += 1;
                    dataStoreArray[0].national.active += 1;
                } else {
                    dataStoreArray[0][branchCode].inactive += 1;
                    dataStoreArray[0].national.inactive += 1;
                    if (outletName) {
                        dataStoreArray[0][branchCode].inActiveOutletList = dataStoreArray[0][branchCode].inActiveOutletList
                            ? dataStoreArray[0][branchCode].inActiveOutletList + `, ${outletName}`
                            : outletName;
                    }
                }
                dataStoreArray[0][branchCode].total += 1;
                dataStoreArray[0].national.total += 1;
            }
        }
    });

    // Count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
    workbookData[sheetName].forEach(deviceIdElement => {
        const branchCode = deviceIdElement['Branch Code'];
        const currentStatus = deviceIdElement['Current Status'];
        const outletName = deviceIdElement['Outlet Name']?.trim();

        if (currentStatus === 'Verified & Temp Closed' && outletName &&
            (targetBranches ? targetBranches.includes(branchCode) : true) &&
            dataStoreArray[0][branchCode]) {
            dataStoreArray[0][branchCode].tempClosed += 1;
            dataStoreArray[0].national.tempClosed += 1;
            dataStoreArray[0][branchCode].tempClosedOutletList = dataStoreArray[0][branchCode].tempClosedOutletList
                ? dataStoreArray[0][branchCode].tempClosedOutletList + `, ${outletName}`
                : outletName;
        }
    });

    return dataStoreArray;
}

// Common function to add Squad360 data
function addSquad360Data(dataStoreArray, squad360Data, targetBranches = null, uniqueBranchCodes = null) {
    let squad360Active = 0;
    let squad360Inactive = 0;
    let squad360Skipped = 0;

    if (squad360Data.length === 0) {
        return { squad360Active, squad360Inactive, squad360Skipped };
    }

    squad360Data.forEach(screen => {
        const branchCode = screen.branch;

        // Skip if branchCode is empty/null
        if (!branchCode) {
            console.log("Skipping screen with empty branchCode:", screen.screenId || screen.name);
            squad360Skipped++;
            return;
        }

        // If targetBranches is provided, only process those branches
        // Otherwise, process all branches (even if not in uniqueBranchCodes)
        if (targetBranches && !targetBranches.includes(branchCode)) {
            squad360Skipped++;
            return;
        }

        // Ensure branch exists in dataStoreArray
        if (!dataStoreArray[0][branchCode]) {
            dataStoreArray[0][branchCode] = { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0, "inActiveOutletList": "", "tempClosedOutletList": "" };
        }

        if (screen.isActive === 'Active') {
            dataStoreArray[0].national.active += 1;
            dataStoreArray[0][branchCode].active += 1;
            squad360Active += 1;
        } else {
            dataStoreArray[0].national.inactive += 1;
            dataStoreArray[0][branchCode].inactive += 1;
            squad360Inactive += 1;
            const outletName = screen.name || screen.wdName || '';
            if (outletName) {
                dataStoreArray[0][branchCode].inActiveOutletList = dataStoreArray[0][branchCode].inActiveOutletList
                    ? dataStoreArray[0][branchCode].inActiveOutletList + `, ${outletName}`
                    : outletName;
            }
        }
        dataStoreArray[0].national.total += 1;
        dataStoreArray[0][branchCode].total += 1;
    });

    return { squad360Active, squad360Inactive, squad360Skipped };
}

// Function to get SQUAD-360 previous day data
async function getSquad360PreviousDayData() {
    try {
        const targetDateStr = previousDate.format("YYYY-MM-DD");

        // Login
        const loginResponse = await axios.post(
            'https://monitor-api.squad360.in/api/v1/auth/login',
            { email: "tw@squad360.in", password: "CMWjDJfabG" },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const token = loginResponse.data.accessToken;

        // Fetch screens
        const screensResponse = await axios.get(
            `https://monitor-api.squad360.in/api/v1/uptime/data?fromDate=${targetDateStr}&toDate=${targetDateStr}&filterType=uptime&screenTypeFilter=mpdu`,
            { headers: { authorization: `Bearer ${token}` } }
        );

        const allScreensData = screensResponse.data;
        const targetDate = allScreensData.days?.[0] || targetDateStr;

        // Format each screen exactly as you specified
        const formattedScreens = allScreensData.screens.map(screen => {
            const outlet = screen.outlet || {};
            const profile = screen.profile || {};

            // Determine real-time active status from uptime
            const uptimeEntry = screen.uptime?.find(u => u.date === targetDate);
            const isActive = uptimeEntry?.status === 'online' ? 'Active' : 'InActive';

            return {
                screenId: screen.id || '', // ✅ matches your "screenId" field (from screen.id)
                displayStatus: profile.displayStatus || '', // ✅ from profile
                isActive: isActive, // ✅ derived from uptime (replaces statusMap)
                branch: outlet.branch || '',
                dhanushId: outlet.dhanushId || '',
                wdCode: outlet.wdCode || '',
                wdName: outlet.wdName || '',
                name: outlet.name || '',
                address: outlet.address || '',
                pinCode: outlet.pinCode || '',
                city: outlet.city || '',
                state: outlet.state || '',
                status: outlet.status || '',
                channel: outlet.channel || '',
                ownerName: outlet.ownerName || '',
                ownerContactNumber: outlet.ownerContactNumber || '',
                teamLeadName: outlet.teamLeadName || '',
                teamLeadContactNumber: outlet.teamLeadContactNumber || '',
                areaExecutiveName: outlet.areaExecutiveName || '',
                areaExecutiveContactNumber: outlet.areaExecutiveContactNumber || '',
                areaManagerName: outlet.areaManagerName || '',
                areaManagerContactNumber: outlet.areaManagerContactNumber || '',
                areaManagerMailId: outlet.areaManagerMailId || ''
            };
        });

        return formattedScreens;

    } catch (error) {
        console.error("Error fetching SQUAD-360 data:", error?.response?.data || error.message);
        return [];
    }
}

// Function to get live data from APIs (for evening)
async function getLiveData() {
    try {
        console.log('Getting live data from APIs...');

        // Get MPDU data from API
        await getAccessToken(1);
        const server1Results = await getApiData(1);
        const mpduData = server1Results.map(item => ({ ...item, sourceServer: 1 }));

        // Get Squad360 data
        const squad360Data = await getSquad360Data();

        return {
            mpduData,
            squad360Data
        };
    } catch (error) {
        console.error("Error getting live data:", error);
        throw error;
    }
}

// Function to get previous day data from database (for morning)
async function getPreviousDayData() {
    try {
        console.log('Getting previous day data from database...');

        // Get MPDU data from database
        const dbResponse = await pool.query(`select * from display_data_table where custom_date = '${previousDate.format("YYYY-MM-DD")}'`);
        console.log("Data From display_data_table ::", dbResponse.rows.length);

        // Return raw database rows for MPDU (will be processed using user's provided logic)
        const mpduData = dbResponse.rows;

        // Get Squad360 previous day data
        const squad360Data = await getSquad360PreviousDayData();

        return {
            mpduData,
            squad360Data
        };
    } catch (error) {
        console.error("Error getting previous day data:", error);
        throw error;
    }
}

// Common function to validate branch totals
function validateBranchTotals(dataStoreArray, branchesToCheck, reportType) {
    let branchWiseActiveSum = 0;
    let branchWiseInactiveSum = 0;
    let branchWiseTempClosedSum = 0;
    let branchWiseTotalSum = 0;

    // Get all branches from dataStoreArray (including Squad360 branches that might not be in branchesToCheck)
    const allBranchesInData = Object.keys(dataStoreArray[0]).filter(key => key !== 'national');

    // Sum all branches in dataStoreArray
    allBranchesInData.forEach(branch => {
        if (dataStoreArray[0][branch]) {
            branchWiseActiveSum += dataStoreArray[0][branch].active || 0;
            branchWiseInactiveSum += dataStoreArray[0][branch].inactive || 0;
            branchWiseTempClosedSum += dataStoreArray[0][branch].tempClosed || 0;
            branchWiseTotalSum += dataStoreArray[0][branch].total || 0;
        }
    });

    console.log(`\n--- ${reportType} Branch-wise Total Validation ---`);
    console.log(`National Total - Active: ${dataStoreArray[0].national.active}, Inactive: ${dataStoreArray[0].national.inactive}, TempClosed: ${dataStoreArray[0].national.tempClosed}, Total: ${dataStoreArray[0].national.total}`);
    console.log(`Sum of All Branches - Active: ${branchWiseActiveSum}, Inactive: ${branchWiseInactiveSum}, TempClosed: ${branchWiseTempClosedSum}, Total: ${branchWiseTotalSum}`);

    // Log branches that are in dataStoreArray but not in branchesToCheck (likely from Squad360)
    // const branchesNotInCheck = allBranchesInData.filter(branch => !branchesToCheck.includes(branch));
    // if (branchesNotInCheck.length > 0) {
    //     // console.log(`\n--- ${reportType} Additional Branches (not in branchesToCheck, likely from Squad360) ---`);
    //     branchesNotInCheck.forEach(branch => {
    //         if (dataStoreArray[0][branch]) {
    //             console.log(`${branch}: Active: ${dataStoreArray[0][branch].active || 0}, Inactive: ${dataStoreArray[0][branch].inactive || 0}, TempClosed: ${dataStoreArray[0][branch].tempClosed || 0}, Total: ${dataStoreArray[0][branch].total || 0}`);
    //         }
    //     });
    // }

    // Check if there's a difference
    const hasDifference = dataStoreArray[0].national.active - branchWiseActiveSum !== 0 ||
        dataStoreArray[0].national.inactive - branchWiseInactiveSum !== 0 ||
        dataStoreArray[0].national.tempClosed - branchWiseTempClosedSum !== 0 ||
        dataStoreArray[0].national.total - branchWiseTotalSum !== 0;

    return { hasDifference, branchWiseActiveSum, branchWiseInactiveSum, branchWiseTempClosedSum, branchWiseTotalSum };
}

// =================================================================================================
// EXCEL GENERATION AND EMAIL FUNCTIONS
// =================================================================================================

// Email configuration - Update these with your SMTP settings
const emailConfig = {
    host: 'smtp.dreamhost.com', // Update with your SMTP host
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'hitesh.kumar@techworks.co.in', // Update with your email
        pass: '4VqvS&RY*ZFnqaU1' // Update with your app password
    }
};

// Function to generate Excel file for Techworks data
async function generateTechworksExcel(apiData, folderPath) {
    try {
        // Ensure the folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const formattedDate = moment().tz('Asia/Kolkata').format('DD-MMM-YYYY-hhA');
        const fileName = `techworksMpdu_${formattedDate}.xlsx`;
        const filePath = path.join(folderPath, fileName);

        // Prepare data for Excel - flatten the API data structure
        const excelData = apiData.map(item => ({
            'Current Time': moment().tz('Asia/Kolkata').format('DD-MMM-YYYY hh:mm A'),
            'Display': item.display || '',
            'Logged In': item.loggedIn || 0,
            'Source Server': item.sourceServer || '',
            'ID': item.id || '',
            'Status': item.loggedIn === 1 ? 'Active' : 'Inactive'
        }));

        const ws = xlsx.utils.json_to_sheet(excelData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Techworks Data");
        xlsx.writeFile(wb, filePath);

        console.log(`\nTechworks Excel file saved: ${fileName}`);
        return filePath;
    } catch (error) {
        console.error("Error generating Techworks Excel file:", error);
        throw error;
    }
}

// Function to generate Excel file for Squad360 data
async function generateSquad360Excel(squad360Data, folderPath) {
    try {
        // Ensure the folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const formattedDate = moment().tz('Asia/Kolkata').format('DD-MMM-YYYY-hhA');
        const fileName = `squad360Mpdu_${formattedDate}.xlsx`;
        const filePath = path.join(folderPath, fileName);

        // Prepare data for Excel
        const excelData = squad360Data.map(item => ({
            'Current Time': moment().tz('Asia/Kolkata').format('DD-MMM-YYYY hh:mm A'),
            'Screen ID': item.screenId || '',
            'Display Status': item.displayStatus || '',
            'Is Active': item.isActive || '',
            'Branch': item.branch || '',
            'Dhanush ID': item.dhanushId || '',
            'WD Code': item.wdCode || '',
            'WD Name': item.wdName || '',
            'Screen Name': item.name || '',
            'Screen Address': item.address || '',
            'Pin Code': item.pinCode || '',
            'City': item.city || '',
            'State': item.state || '',
            'Status': item.status || '',
            'Channel': item.channel || '',
            'Owner Name': item.ownerName || '',
            'Owner Contact': item.ownerContactNumber || '',
            'Team Lead Name': item.teamLeadName || '',
            'Team Lead Contact': item.teamLeadContactNumber || '',
            'Area Executive Name': item.areaExecutiveName || '',
            'Area Executive Contact': item.areaExecutiveContactNumber || '',
            'Area Manager Name': item.areaManagerName || '',
            'Area Manager Contact': item.areaManagerContactNumber || '',
            'Area Manager Email': item.areaManagerMailId || ''
        }));

        const ws = xlsx.utils.json_to_sheet(excelData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Squad360 Data");
        xlsx.writeFile(wb, filePath);

        console.log(`\nSquad360 Excel file saved: ${fileName}`);
        return filePath;
    } catch (error) {
        console.error("Error generating Squad360 Excel file:", error);
        throw error;
    }
}

// Function to send email with Excel attachments
async function sendEmailWithAttachments(squad360FilePath) {
    try {
        // Create transporter
        const transporter = nodemailer.createTransport(emailConfig);

        const formattedDate = moment().tz('Asia/Kolkata').format('DD-MMM-YYYY hh:mm A');

        // Email content
        const mailOptions = {
            from: 'reports@techworks.co.in',
            // to: 'hitesh.kumar@techworks.co.in',
            to: 'rohanwork2002@gmail.com',
            cc: 'dhruv@techworks.co.in, rusum@techworks.co.in, sandip@techworks.co.in, hitesh.kumar@techworks.co.in',
            subject: `MPDU Squad360 Online/Offline Whatsapp Report - ${formattedDate}`,
            html: `<h6>Please find the attachment.</h6>
            <p>&nbsp;</p>
            <table style="width:450px; font-size: 10pt; font-family: Verdana, sans-serif; background: transparent !important;"
                border="0" cellspacing="0" cellpadding="0">
                <tbody>
                    <tr>
                        <td style="width: 200px; font-size: 10pt; font-family: Verdana, sans-serif; vertical-align: top;"
                            valign="top">
                            <p style="margin-bottom: 18px; padding: 0px;"><span
                                    style="font-size: 12pt; font-family: Verdana, sans-serif; color: #183884; font-weight: bold;">Techworks
                                    Reports<br /></span><span
                                    style="font-family: Verdana, sans-serif; font-size: 9pt; color: #183884;">DS Techworks
                                    Solutions</span></p>
                            <p style="margin-top: 0px; margin-bottom: 18px; padding: 0px;"><a
                                    href="http://www.vcard.techworksworld.com/techworks_reports/" target="_blank"><img
                                        style="width: 120px; height: auto; border: 0;"
                                        src="https://raw.githubusercontent.com/tw-designer/tw-emp-qr-links/main/qr_techworks_reports.png"
                                        width="120" border="0" /></a></p>
                            <p
                                style="margin-bottom: 0px; padding: 0px; font-family: Verdana, sans-serif; font-size: 9pt; line-height: 12pt;">
                                <a style="color: #e25422; text-decoration: none; font-weight: bold;"
                                    href="http://www.techworksworld.com" rel="noopener"><span
                                        style="text-decoration: none; font-size: 9pt; line-height: 12pt; color: #e25422; font-family: Verdana, sans-serif; font-weight: bold;">www.techworksworld.com</span></a>
                            </p>
                        </td>
                        <td style="width: 10px; min-width: 10px; border-right: 1px solid #e25422;">&nbsp;</td>
                        <td style="width: 10px; min-width: 10px;">&nbsp;</td>
                        <td style="width: 250px; font-size: 10pt; color: #444444; font-family: Verdana, sans-serif; vertical-align: top;"
                            valign="top">
                            <p
                                style="font-family: Verdana, sans-serif; padding: 0px; font-size: 9pt; line-height: 14pt; margin-bottom: 14px;">
                                <span style="font-family: Verdana, sans-serif; font-size: 9pt; line-height: 14pt;"><span
                                        style="font-size: 9pt; line-height: 13pt; color: #262626;"><strong>E: </strong></span><a
                                        style="font-size: 9pt; color: #262626; text-decoration: none;"
                                        href="mailto:reports@techworks.co.in"><span
                                            style="text-decoration: none; font-size: 9pt; line-height: 14pt; color: #262626; font-family: Verdana, sans-serif;">reports@techworks.co.in</span></a><span><br /></span></span><span><span
                                        style="font-size: 9pt; color: #262626;"><strong>T:</strong></span><span
                                        style="font-size: 9pt; color: #262626;">(+91)
                                        8920131195</span><span><br /></span></span><span><span
                                        style="font-size: 9pt; color: #262626;"><strong>A:</strong></span><span
                                        style="font-size: 9pt; color: #262626;"> O-7, 2nd Floor Lajpat Nagar-II, </span><span
                                        style="color: #262626;">New Delhi-110024, India</span></span></p>
                            <p style="margin-bottom: 0px; padding: 0px;"><span><a
                                        href="https://www.facebook.com/TechworksSolutionsPvtLtd/" rel="noopener"><img
                                            style="border: 0; height: 22px; width: 22px;"
                                            src="https://www.mail-signatures.com/signature-generator/img/templates/inclusive/fb.png"
                                            width="22" border="0" /></a>&nbsp;</span><span><a
                                        href="https://www.linkedin.com/company/ds-techworks-solutions-pvt-ltd/" rel="noopener"><img
                                            style="border: 0; height: 22px; width: 22px;"
                                            src="https://www.mail-signatures.com/signature-generator/img/templates/inclusive/ln.png"
                                            width="22" border="0" /></a>&nbsp;</span><span><a href="https://twitter.com/techworks14"
                                        rel="noopener"><img style="border: 0; height: 22px; width: 22px;"
                                            src="https://www.mail-signatures.com/signature-generator/img/templates/inclusive/tt.png"
                                            width="22" border="0" /></a>&nbsp;</span><span><a
                                        href="https://www.youtube.com/@TechworksDigitalSolutions" rel="noopener"><img
                                            style="border: 0; height: 22px; width: 22px;"
                                            src="https://www.mail-signatures.com/signature-generator/img/templates/inclusive/yt.png"
                                            width="22" border="0" /></a>&nbsp;</span><span><a
                                        href="https://www.instagram.com/techworks140/" rel="noopener"><img
                                            style="border: 0; height: 22px; width: 22px;"
                                            src="https://www.mail-signatures.com/signature-generator/img/templates/inclusive/it.png"
                                            width="22" border="0" /></a></span></p>
                        </td>
                    </tr>
                    <tr style="width: 420px;">
                        <td style="padding-top: 14px;" colspan="4"><a href="https://techworksworld.com/" rel="noopener"><img
                                    style="width: 420px; height: auto; border: 0;" src="https://i.imgur.com/QoPxSPy.png" width="420"
                                    border="0" /></a></td>
                    </tr>
                    <tr>
                        <td style="padding-top: 14px; text-align: justify;" colspan="4">
                            <table
                                style="width: 420px; font-size: 10pt; font-family: Verdana, sans-serif; background: transparent !important;"
                                border="0" cellspacing="0" cellpadding="0">
                                <tbody>
                                    <tr>
                                        <td style="font-size: 8pt; color: #b2b2b2; line-height: 9pt; text-align: justify;">The
                                            content of this email is confidential and intended for the recipient specified in
                                            message only. It is strictly forbidden to share any part of this message with any third
                                            party,without a written consent of the sender. If you received this message by
                                            mistake,please reply to this message and follow with its deletion,so that we can ensure
                                            such a mistake does not occur in the future.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>`,
            attachments: [
                {
                    filename: path.basename(squad360FilePath),
                    path: squad360FilePath
                }
            ]
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`\nEmail sent successfully: ${info.messageId}`);
        console.log(`Recipients: ${mailOptions.to}`);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}

// =================================================================================================
// API AND DATA FETCHING FUNCTIONS
// =================================================================================================

async function getAccessToken(serverNumber) {
    const serverKey = `server${serverNumber}`;
    if (tokenStorage[serverKey]) {
        return tokenStorage[serverKey];
    }

    const requestBody = {
        grant_type: 'client_credentials',
        client_id: serverNumber === 1 ? clientIDServer1 : clientIDServer2,
        client_secret: serverNumber === 1 ? clientSecretServer1 : clientSecretServer2
    };
    const tokenEndpoint = serverNumber === 1 ? tokenEndpointServer1 : tokenEndpointServer2;
    const response = await axios.post(tokenEndpoint, querystring.stringify(requestBody), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    tokenStorage[serverKey] = response.data.access_token;
    console.log(`New token generated for Server ${serverNumber}`);
    return tokenStorage[serverKey];
}

async function getApiData(serverNumber) {
    const batchSize = 10;
    let offset = 0;
    const results = [];
    const apiUrl = serverNumber === 1 ? apiUrlServer1 : apiUrlServer2;
    const token = await getAccessToken(serverNumber);
    const headers = {
        Authorization: `Bearer ${token}`
    };

    try {
        while (true) {
            const { data } = await axios.get(`${apiUrl}/display?start=${offset}`, { headers });
            if (data.length === 0) break;

            results.push(...data);
            offset += batchSize;
            console.log(`Server ${serverNumber} - Offset updated to :: ${offset}`);
        }
        console.log(`Server ${serverNumber} - Total Items Fetched :: ${results.length}`);
        return results;
    } catch (error) {
        console.error(`Error fetching data from server ${serverNumber}:`, error.message);
        throw error;
    }
}

async function getBaseDataFromGoogleSheets() {
    const keyFilePath = path.join(__dirname, '../../credentials.json');

    const accessGoogleSheet = async () => {
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: keyFilePath,
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });
            const authClientObject = await auth.getClient();
            return google.sheets({ version: 'v4', auth: authClientObject });
        } catch (error) {
            console.error("Error initializing Google Sheets API:", error);
            throw error;
        }
    };

    const getWorkbookWiseData = async (sheets, sheetDetails) => {
        try {
            for (const detail of sheetDetails) {
                const { sheetName, filterStatus, filterStatus2 } = detail;
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: sheetName,
                });

                const data = response.data.values || [];
                const [headers, ...rows] = data;
                let result = rows.map(row => Object.fromEntries(headers.map((key, index) => [key, row[index]])));
                result = result.filter(i => {
                    const statusMatch = filterStatus2
                        ? (i['Current Status'] == filterStatus || i['Current Status'] == filterStatus2)
                        : (i['Current Status'] == filterStatus);
                    return statusMatch && i['Branch Code'];
                });
                workbookData[sheetName] = result;
            }
        } catch (error) {
            console.error("Error fetching data for sheets:", error);
            throw error;
        }
        return true;
    };

    try {
        const sheets = await accessGoogleSheet();
        return await getWorkbookWiseData(sheets, [
            { sheetName: 'All Device', filterStatus: 'Verified & Currently Installed', filterStatus2: 'Verified & Temp Closed' },
            { sheetName: '43 Inch Vertical', filterStatus: 'Verified & Working', filterStatus2: 'Verified & Temp Closed' }
        ]);
    } catch (error) {
        console.error("Error during Google Sheets data retrieval:", error);
        return false;
    }
}

// Function to get SQUAD-360 data
async function getSquad360Data() {
    try {
        // Get access token
        const data = JSON.stringify({
            "email": "tw@squad360.in",
            "password": "CMWjDJfabG"
        });

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://monitor-api.squad360.in/api/v1/auth/login',
            headers: {
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios.request(config);
        const token = response.data.accessToken;

        // Get all screens
        const screensConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://monitor-api.squad360.in/api/v1/screens',
            headers: {
                'authorization': `Bearer ${token}`
            }
        };

        const screensResponse = await axios.request(screensConfig);
        const allScreensData = screensResponse.data;

        // Get all screens status
        const statusConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://monitor-api.squad360.in/api/v1/screens/offline-by-branch',
            headers: {
                'authorization': `Bearer ${token}`
            }
        };

        const statusResponse = await axios.request(statusConfig);
        const allScreensStatus = statusResponse?.data?.data?.branchStats?.flatMap(branch => branch.screens || []);

        // Filter screens with displayStatus="Active" and screenType="backwall"
        const filteredScreens = allScreensData.filter(screen =>
            screen.displayStatus == "Active" &&
            screen.screenType == "mpdu"
        );

        // Create a map of screenId to status for quick lookup
        const statusMap = {};
        if (Array.isArray(allScreensStatus)) {
            allScreensStatus.forEach(statusItem => {
                if (statusItem && statusItem.screenId) {
                    statusMap[statusItem.screenId] = statusItem.status == 'online' ? 'Active' : 'InActive';
                }
            });
        }

        const formattedScreens = filteredScreens.map(screen => {
            return {
                screenId: screen.screenId,
                displayStatus: screen.displayStatus,
                isActive: statusMap[screen.screenId] || 'InActive',
                branch: screen.outlet?.branch || '',
                dhanushId: screen.outlet?.dhanushId || '',
                wdCode: screen.outlet?.wdCode || '',
                wdName: screen.outlet?.wdName || '',
                name: screen.outlet?.name || '',
                address: screen.outlet?.address || '',
                pinCode: screen.outlet?.pinCode || '',
                city: screen.outlet?.city || '',
                state: screen.outlet?.state || '',
                status: screen.outlet?.status || '',
                channel: screen.outlet?.channel || '',
                ownerName: screen.outlet?.ownerName || '',
                ownerContactNumber: screen.outlet?.ownerContactNumber || '',
                teamLeadName: screen.outlet?.teamLeadName || '',
                teamLeadContactNumber: screen.outlet?.teamLeadContactNumber || '',
                areaExecutiveName: screen.outlet?.areaExecutiveName || '',
                areaExecutiveContactNumber: screen.outlet?.areaExecutiveContactNumber || '',
                areaManagerName: screen.outlet?.areaManagerName || '',
                areaManagerContactNumber: screen.outlet?.areaManagerContactNumber || '',
                areaManagerMailId: screen.outlet?.areaManagerMailId || ''
            };
        });

        return formattedScreens;
    } catch (error) {
        console.error("Error fetching SQUAD-360 data:", error);
        return [];
    }
}


// =================================================================================================
// --- MPDU SCRIPT ---
// =================================================================================================
async function sendMpduMorningMessage(dataStoreArray, uniqueBranchCodes) {
    console.log("\n--- Starting MPDU Morning Report ---");

    if (!dataStoreArray || !dataStoreArray[0] || uniqueBranchCodes.length !== 21) {
        console.log("MPDU: BRANCH COUNT NOT MATCHED OR DATA NOT PROVIDED");
        return;
    }

    console.log("Sending MPDU National Messages...");
    for (let key in NationalPOCNum) {
        let phoneNum = `+91${NationalPOCNum[key]}`;
        let nationalMsgRes = await mpduNationalMsg("national_temp_for_mpdu", phoneNum, dataStoreArray);
        console.log(`MPDU National: ${key} ---> ${nationalMsgRes}`);
        await delay(500);
    }

    // await delay(5000);

    console.log("Sending MPDU Branch Messages...");
    for (const branch of uniqueBranchCodes) {
        if (mpduBranchWisePOCNum[branch]) {
            const branchCounts = dataStoreArray[0][branch];
            for (const pocName in mpduBranchWisePOCNum[branch]) {
                let phoneNum = `+91${mpduBranchWisePOCNum[branch][pocName]}`;
                let inActiveOutletListStr = isEmpty(branchCounts.inActiveOutletList) ? "No inactive outlet list found" : branchCounts.inActiveOutletList;
                let tempClosedOutletListStr = isEmpty(branchCounts.tempClosedOutletList) ? "No temporarily closed outlet list found" : branchCounts.tempClosedOutletList;
                let branchMsgRes = await mpduBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `MPDU - ${branch}`, branchCounts, inActiveOutletListStr, tempClosedOutletListStr);
                console.log(`MPDU Branch: ${pocName} - ${branch} ---> ${branchMsgRes}`);
                await delay(500);
            }
        }
    }
}

async function sendMpduEveningMessage(dataStoreArray, targetBranches) {
    console.log("\n--- Starting MPDU Evening Report ---");

    if (!dataStoreArray || !dataStoreArray[0] || !targetBranches || targetBranches.length === 0) {
        console.log("MPDU: DATA NOT PROVIDED");
        return;
    }

    // Loop for each branch
    for (const branch of targetBranches) {
        if (!dataStoreArray[0][branch]) {
            console.log(`MPDU: ${branch} branch not found in the data.`);
            continue;
        }

        console.log("\n");
        console.log(`Sending MPDU ${branch} Branch Messages...`);
        let inActiveOutletListStr = isEmpty(dataStoreArray[0][branch].inActiveOutletList) ? "No inactive outlet list found" : dataStoreArray[0][branch].inActiveOutletList;
        let tempClosedOutletListStr = isEmpty(dataStoreArray[0][branch].tempClosedOutletList) ? "No temporarily closed outlet list found" : dataStoreArray[0][branch].tempClosedOutletList;

        for (let key in eveningBranchNum) {
            let phoneNum = `+91${eveningBranchNum[key]}`;
            let res = await mpduBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `MPDU - ${branch}`, dataStoreArray[0][branch], inActiveOutletListStr, tempClosedOutletListStr);
            console.log(`MPDU ${branch}: ${key} ---> ${res}`);
            await delay(500);
        }

        // Send branch wise message to the POC {SCHE,WPUN}  
        // if (branch === "SCHE" || branch === "WPUN") {
        //     for (const pocName in mpduBranchWisePOCNum[branch]) {
        //         let phoneNum = `+91${mpduBranchWisePOCNum[branch][pocName]}`;
        //         let res = await mpduBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `MPDU - ${branch}`, dataStoreArray[0][branch], inActiveOutletListStr, tempClosedOutletListStr);
        //         console.log(`MPDU ${branch}: ${pocName} ---> ${res}`);
        //         await delay(500);
        //     }
        // }
    }
}

// =================================================================================================
// --- 43 INCH VERTICAL SCRIPT ---
// =================================================================================================
async function send43InchMorningMessage(dataStoreArray, uniqueBranchCodes) {
    console.log("\n--- Starting 43 Inch Vertical Morning Report ---");

    if (!dataStoreArray || !dataStoreArray[0] || uniqueBranchCodes.length !== 9) {
        console.log("43 Inch: BRANCH COUNT NOT MATCHED OR DATA NOT PROVIDED");
        return;
    }

    console.log("Sending 43 Inch Vertical National Messages...");
    for (let key in NationalPOCNum) {
        let phoneNum = `+91${NationalPOCNum[key]}`;
        let nationalMsgRes = await vertical43InchNationalMsg("national_temp_for_43vertical", phoneNum, dataStoreArray);
        console.log(`43 Inch: ${key} ---> ${nationalMsgRes}`);
        await delay(500);
    }

    // await delay(5000);

    console.log("Sending 43 Inch Vertical Branch Messages...");
    for (const branch of uniqueBranchCodes) {
        if (mpduBranchWisePOCNum[branch]) {
            const branchCounts = dataStoreArray[0][branch];
            for (const pocName in mpduBranchWisePOCNum[branch]) {
                let phoneNum = `+91${mpduBranchWisePOCNum[branch][pocName]}`;;
                let inActiveOutletListStr = isEmpty(branchCounts.inActiveOutletList) ? "No inactive outlet list found" : branchCounts.inActiveOutletList;
                let tempClosedOutletListStr = isEmpty(branchCounts.tempClosedOutletList) ? "No temporarily closed outlet list found" : branchCounts.tempClosedOutletList;
                let branchMsgRes = await vertical43InchBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `43 VERTICAL - ${branch}`, branchCounts, inActiveOutletListStr, tempClosedOutletListStr);
                console.log(`43 Inch Branch: ${pocName} - ${branch} ---> ${branchMsgRes}`);
                await delay(500);
            }
        }
    }
}

async function send43InchEveningMessage(dataStoreArray, targetBranches) {
    console.log("\n--- Starting 43 Inch Vertical Evening Report ---");

    if (!dataStoreArray || !dataStoreArray[0] || !targetBranches || targetBranches.length === 0) {
        console.log("43 Inch: DATA NOT PROVIDED");
        return;
    }

    // Send messages for each branch using single eveningBranchNum list
    for (const branch of targetBranches) {
        if (!dataStoreArray[0][branch]) {
            console.log(`43 Inch: ${branch} branch not found in the data.`);
            continue;
        }

        console.log("\n");
        console.log(`Sending 43 Inch ${branch} Branch Messages...`);

        let inActiveOutletListStr = isEmpty(dataStoreArray[0][branch].inActiveOutletList) ? "No inactive outlet list found" : dataStoreArray[0][branch].inActiveOutletList;
        let tempClosedOutletListStr = isEmpty(dataStoreArray[0][branch].tempClosedOutletList) ? "No temporarily closed outlet list found" : dataStoreArray[0][branch].tempClosedOutletList;

        for (let key in eveningBranchNum) {
            let phoneNum = `+91${eveningBranchNum[key]}`;
            let msgRes = await vertical43InchBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `43 VERTICAL - ${branch}`, dataStoreArray[0][branch], inActiveOutletListStr, tempClosedOutletListStr);
            console.log(`43 Inch ${branch}: ${key} ---> ${msgRes}`);
            await delay(500);
        }

        // Send branch wise message to the POC {WPUN}  
        // if (branch === "WPUN") {
        //     for (const pocName in mpduBranchWisePOCNum[branch]) {
        //         let phoneNum = `+91${mpduBranchWisePOCNum[branch][pocName]}`;
        //         let msgRes = await vertical43InchBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `43 VERTICAL - ${branch}`, dataStoreArray[0][branch], inActiveOutletListStr, tempClosedOutletListStr);
        //         console.log(`43 Inch ${branch}: ${pocName} ---> ${msgRes}`);
        //         await delay(500);
        //     }
        // }
    }
}

// =================================================================================================
// MAIN SCRIPT STARTER
// =================================================================================================

async function startScript() {
    console.log("=====================================================================");
    console.log(`SCRIPT RUNNING AT: ${currentTime.format("DD-MM-YYYY hh:mm A")}`);
    console.log("=====================================================================");

    const baseDataReady = await getBaseDataFromGoogleSheets();
    if (!baseDataReady) {
        console.log("FATAL: Problem while getting data from google sheets. Exiting.");
        return;
    }
    console.log("MPDU BASE DATA SHEET ::", workbookData['All Device'] ? workbookData['All Device'].length : 0);
    console.log("43-VERTICAL BASE DATA SHEET ::", workbookData['43 Inch Vertical'] ? workbookData['43 Inch Vertical'].length : 0);

    const currentHour = currentTime.hour();
    if (currentHour > 16) {
        console.log(`\nIt's evening time, script run.`);
        console.log(`EVENING DATA GET DATE :- ${currentTime.format("YYYY-MM-DD")}`, "\n");

        try {
            // Get live data from APIs
            const { mpduData, squad360Data } = await getLiveData();
            console.log(`Total MPDU results from APIs: ${mpduData.length}`);
            console.log(`SQUAD-360: Fetched ${squad360Data.length} devices`);

            // ========== MPDU EVENING CALCULATIONS ==========
            const mpduDataStoreArray = calculateDeviceCounts('All Device', mpduData);
            const uniqueBranchCodes = getUniqueByKey(workbookData['All Device'], 'Branch Code');

            // Log Techworks API data counts for MPDU (Evening)
            console.log("\n--- MPDU Techworks API Data Counts (Evening) ---");
            console.log(`Techworks Active: ${mpduDataStoreArray[0].national.active}, Inactive: ${mpduDataStoreArray[0].national.inactive}, Total: ${mpduDataStoreArray[0].national.total}`);

            // Add Squad360 data
            const squad360Result = addSquad360Data(mpduDataStoreArray, squad360Data, null, uniqueBranchCodes);

            if (squad360Result.squad360Skipped > 0) {
                console.log(`\nSquad360: Skipped ${squad360Result.squad360Skipped} devices with branches not found in Google Sheets`);
            }
            console.log("\n--- MPDU Squad360 Data Counts (Evening) ---");
            console.log(`Squad360 Active: ${squad360Result.squad360Active}, Inactive: ${squad360Result.squad360Inactive}, Total: ${squad360Data.length}`);
            console.log(`\nMPDU Combined (Techworks + Squad360) - Active: ${mpduDataStoreArray[0].national.active}, Inactive: ${mpduDataStoreArray[0].national.inactive}, Total: ${mpduDataStoreArray[0].national.total}`);

            // Branch difference check
            const mpduValidation = validateBranchTotals(mpduDataStoreArray, uniqueBranchCodes, "MPDU EVENING");
            if (mpduValidation.hasDifference) {
                console.log("MPDU EVENING: BRANCH COUNT NOT MATCHED - STOPPING SCRIPT");
                return;
            }

            // ========== 43 INCH VERTICAL EVENING CALCULATIONS ==========
            // 43 Inch Vertical uses 'Verified & Working' status instead of 'Verified & Currently Installed'
            const verticalDataStoreArray = calculateDeviceCounts('43 Inch Vertical', mpduData, null, 'Verified & Working');
            const verticalUniqueBranchCodes = getUniqueByKey(workbookData['43 Inch Vertical'], 'Branch Code');

            // Branch difference check
            const verticalValidation = validateBranchTotals(verticalDataStoreArray, verticalUniqueBranchCodes, "43 INCH VERTICAL EVENING");
            if (verticalValidation.hasDifference) {
                console.log("43 INCH VERTICAL EVENING: BRANCH COUNT NOT MATCHED - STOPPING SCRIPT");
                return;
            }


            // Generate Excel files and send email
            console.log("\n--- Generating Excel Files and Sending Email (Evening) ---");
            const dailyFilesFolder = path.join(__dirname, 'mpdu-43vertical-daily-files');
            try {
                const squad360FilePath = await generateSquad360Excel(squad360Data, dailyFilesFolder);
                await sendEmailWithAttachments(squad360FilePath);
                console.log("Excel files generated and email sent successfully.\n");
            } catch (error) {
                console.error("Error generating Excel files or sending email:", error);
                // Continue with message sending even if email fails
            }

            await delay(8000);

            // Send evening messages using same functions as morning
            await Promise.all([
                sendMpduMorningMessage(mpduDataStoreArray, uniqueBranchCodes),
                send43InchMorningMessage(verticalDataStoreArray, verticalUniqueBranchCodes)
            ]);

        } catch (error) {
            console.error('Error during evening data retrieval:', error);
        }

    } else {
        console.log(`\nIt's morning time, script run.`);
        console.log(`MORNING DATA GET DATE :- ${previousDate.format("YYYY-MM-DD")}`, "\n");
        try {
            // Get previous day data from database
            const { mpduData, squad360Data } = await getPreviousDayData();
            console.log(`Total MPDU results from database: ${mpduData.length}`);
            console.log(`SQUAD-360: Fetched ${squad360Data.length} devices`);

            // ========== MPDU MORNING CALCULATIONS ==========
            // Build MPDU data store array from database data using provided logic
            let mpduDataStoreArray = [{ "national": { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0 } }];
            let mpduAllZero = false;
            const uniqueBranchCodes = getUniqueByKey(workbookData['All Device'], 'Branch Code');

            if (workbookData['All Device'] && workbookData['All Device'].length > 0 && mpduData.length > 0) {

                uniqueBranchCodes.forEach(branch => {
                    mpduDataStoreArray[0][branch] = { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0, "inActiveOutletList": "", "tempClosedOutletList": "" };
                });

                workbookData['All Device'].forEach(deviceIdElement => {
                    const currentStatus = deviceIdElement['Current Status'];
                    const branchCode = deviceIdElement['Branch Code'];

                    // Only count devices with "Verified & Currently Installed" status for active/inactive/total
                    if (currentStatus === 'Verified & Currently Installed') {
                        const findDeviceByTechworksId = mpduData.find(d => d.display_name == deviceIdElement['Techworks ID']);
                        const outletName = deviceIdElement['Outlet Name']?.trim();

                        if (findDeviceByTechworksId) {
                            const onlineDevice = mpduData.find(d => d.display_name.replace(/\s*(\(new\)|\t)\s*/gi, '') == deviceIdElement['Techworks ID'] && Number(d.display_count) > 0);

                            if (onlineDevice) {
                                mpduDataStoreArray[0][branchCode].active += 1;
                                mpduDataStoreArray[0].national.active += 1;
                            } else {
                                mpduDataStoreArray[0][branchCode].inactive += 1;
                                mpduDataStoreArray[0].national.inactive += 1;
                                if (outletName) {
                                    mpduDataStoreArray[0][branchCode].inActiveOutletList = mpduDataStoreArray[0][branchCode].inActiveOutletList
                                        ? mpduDataStoreArray[0][branchCode].inActiveOutletList + `, ${outletName}`
                                        : outletName;
                                }
                            }

                            mpduDataStoreArray[0][branchCode].total += 1;
                            mpduDataStoreArray[0].national.total += 1;
                        }
                    }
                });

                // Count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
                workbookData['All Device'].forEach(deviceIdElement => {
                    const branchCode = deviceIdElement['Branch Code'];
                    const currentStatus = deviceIdElement['Current Status'];
                    const outletName = deviceIdElement['Outlet Name']?.trim();

                    if (currentStatus === 'Verified & Temp Closed' && outletName &&
                        mpduDataStoreArray[0][branchCode]) {
                        mpduDataStoreArray[0][branchCode].tempClosed += 1;
                        mpduDataStoreArray[0].national.tempClosed += 1;
                        mpduDataStoreArray[0][branchCode].tempClosedOutletList = mpduDataStoreArray[0][branchCode].tempClosedOutletList ? mpduDataStoreArray[0][branchCode].tempClosedOutletList + `, ${outletName}` : outletName;
                    }
                });
            }

            // Log database data counts for MPDU (Morning)
            console.log("\n--- MPDU Database Data Counts (Morning) ---");
            console.log(`Database Active: ${mpduDataStoreArray[0].national.active}, Inactive: ${mpduDataStoreArray[0].national.inactive}, Total: ${mpduDataStoreArray[0].national.total}`);

            // Add Squad360 previous day data
            const squad360Result = addSquad360Data(mpduDataStoreArray, squad360Data, null, uniqueBranchCodes);

            if (squad360Result.squad360Skipped > 0) {
                console.log(`\nSquad360: Skipped ${squad360Result.squad360Skipped} devices with branches not found in Google Sheets`);
            }
            console.log("\n--- MPDU Squad360 Data Counts (Morning) ---");
            console.log(`Squad360 Active: ${squad360Result.squad360Active}, Inactive: ${squad360Result.squad360Inactive}, Total: ${squad360Data.length}`);
            console.log(`\nMPDU Combined (Techworks + Squad360) - Active: ${mpduDataStoreArray[0].national.active}, Inactive: ${mpduDataStoreArray[0].national.inactive}, Total: ${mpduDataStoreArray[0].national.total}`);

            // Branch difference check
            const mpduValidation = validateBranchTotals(mpduDataStoreArray, uniqueBranchCodes, "MPDU MORNING");
            if (mpduValidation.hasDifference) {
                console.log("MPDU MORNING: BRANCH COUNT NOT MATCHED - STOPPING SCRIPT");
                return;
            }

            if (workbookData['All Device'] && workbookData['All Device'].length > 0 && mpduData.length > 0) {

                let mpduMessageBodyNational = `
NATIONAL MPDU STATUS:

Total : ${mpduDataStoreArray[0].national.active} (Active) / ${mpduDataStoreArray[0].national.inactive} (InActive) / ${mpduDataStoreArray[0].national.tempClosed} (TempClosed)
WBHO : ${mpduDataStoreArray[0].WBHO?.active || 0} (Active) / ${mpduDataStoreArray[0].WBHO?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].WBHO?.tempClosed || 0} (TempClosed)
WNAG : ${mpduDataStoreArray[0].WNAG?.active || 0} (Active) / ${mpduDataStoreArray[0].WNAG?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].WNAG?.tempClosed || 0} (TempClosed)
WAHM : ${mpduDataStoreArray[0].WAHM?.active || 0} (Active) / ${mpduDataStoreArray[0].WAHM?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].WAHM?.tempClosed || 0} (TempClosed)
EVIZ : ${mpduDataStoreArray[0].EVIZ?.active || 0} (Active) / ${mpduDataStoreArray[0].EVIZ?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].EVIZ?.tempClosed || 0} (TempClosed)
SHYD : ${mpduDataStoreArray[0].SHYD?.active || 0} (Active) / ${mpduDataStoreArray[0].SHYD?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].SHYD?.tempClosed || 0} (TempClosed)
SBLR : ${mpduDataStoreArray[0].SBLR?.active || 0} (Active) / ${mpduDataStoreArray[0].SBLR?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].SBLR?.tempClosed || 0} (TempClosed)
SCHE : ${mpduDataStoreArray[0].SCHE?.active || 0} (Active) / ${mpduDataStoreArray[0].SCHE?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].SCHE?.tempClosed || 0} (TempClosed)
NJPR : ${mpduDataStoreArray[0].NJPR?.active || 0} (Active) / ${mpduDataStoreArray[0].NJPR?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].NJPR?.tempClosed || 0} (TempClosed)
WMUM : ${mpduDataStoreArray[0].WMUM?.active || 0} (Active) / ${mpduDataStoreArray[0].WMUM?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].WMUM?.tempClosed || 0} (TempClosed)
WPUN : ${mpduDataStoreArray[0].WPUN?.active || 0} (Active) / ${mpduDataStoreArray[0].WPUN?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].WPUN?.tempClosed || 0} (TempClosed)
NLUC : ${mpduDataStoreArray[0].NLUC?.active || 0} (Active) / ${mpduDataStoreArray[0].NLUC?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].NLUC?.tempClosed || 0} (TempClosed)
NEUP : ${mpduDataStoreArray[0].NEUP?.active || 0} (Active) / ${mpduDataStoreArray[0].NEUP?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].NEUP?.tempClosed || 0} (TempClosed)
EORI : ${mpduDataStoreArray[0].EORI?.active || 0} (Active) / ${mpduDataStoreArray[0].EORI?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].EORI?.tempClosed || 0} (TempClosed)
ECAL : ${mpduDataStoreArray[0].ECAL?.active || 0} (Active) / ${mpduDataStoreArray[0].ECAL?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].ECAL?.tempClosed || 0} (TempClosed)
EGAU : ${mpduDataStoreArray[0].EGAU?.active || 0} (Active) / ${mpduDataStoreArray[0].EGAU?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].EGAU?.tempClosed || 0} (TempClosed)
NSAH : ${mpduDataStoreArray[0].NSAH?.active || 0} (Active) / ${mpduDataStoreArray[0].NSAH?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].NSAH?.tempClosed || 0} (TempClosed)
NCHA : ${mpduDataStoreArray[0].NCHA?.active || 0} (Active) / ${mpduDataStoreArray[0].NCHA?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].NCHA?.tempClosed || 0} (TempClosed)
NDEL : ${mpduDataStoreArray[0].NDEL?.active || 0} (Active) / ${mpduDataStoreArray[0].NDEL?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].NDEL?.tempClosed || 0} (TempClosed)
SKAR : ${mpduDataStoreArray[0].SKAR?.active || 0} (Active) / ${mpduDataStoreArray[0].SKAR?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].SKAR?.tempClosed || 0} (TempClosed)
SCOI : ${mpduDataStoreArray[0].SCOI?.active || 0} (Active) / ${mpduDataStoreArray[0].SCOI?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].SCOI?.tempClosed || 0} (TempClosed)
SERN : ${mpduDataStoreArray[0].SERN?.active || 0} (Active) / ${mpduDataStoreArray[0].SERN?.inactive || 0} (Inactive) / ${mpduDataStoreArray[0].SERN?.tempClosed || 0} (TempClosed)
`;
                console.log("\nMPDU SUMMARY PREVIEW:\n" + mpduMessageBodyNational);
                mpduAllZero = allBranchesZero(mpduDataStoreArray[0], uniqueBranchCodes);
            }

            // ========== 43 INCH VERTICAL MORNING CALCULATIONS ==========
            // Transform database data to match API format for calculateDeviceCounts
            const transformedMpduData = mpduData.map(row => ({
                display: row.display_name,
                loggedIn: Number(row.display_count) > 0 ? 1 : 0,
                id: row.id || '',
                sourceServer: 'database'
            }));

            // 43 Inch Vertical uses 'Verified & Working' status instead of 'Verified & Currently Installed'
            const verticalDataStoreArray = calculateDeviceCounts('43 Inch Vertical', transformedMpduData, null, 'Verified & Working');
            const verticalUniqueBranchCodes = getUniqueByKey(workbookData['43 Inch Vertical'], 'Branch Code');

            // Branch difference check
            const verticalValidation = validateBranchTotals(verticalDataStoreArray, verticalUniqueBranchCodes, "43 INCH VERTICAL MORNING");
            if (verticalValidation.hasDifference) {
                console.log("43 INCH VERTICAL MORNING: BRANCH COUNT NOT MATCHED - STOPPING SCRIPT");
                return;
            }

            let verticalAllZero = false;
            if (workbookData['43 Inch Vertical'] && workbookData['43 Inch Vertical'].length > 0 && mpduData.length > 0) {

                let verticalMessageBodyNational = `
NATIONAL 43 VERTICAL STATUS
NATIONAL WISE
Total : ${verticalDataStoreArray[0].national.active} (Active) / ${verticalDataStoreArray[0].national.inactive} (Inactive) / ${verticalDataStoreArray[0].national.tempClosed} (TempClosed)

BRANCH WISE
WMUM : ${verticalDataStoreArray[0].WMUM?.active || 0} (Active) / ${verticalDataStoreArray[0].WMUM?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].WMUM?.tempClosed || 0} (TempClosed)
ECAL : ${verticalDataStoreArray[0].ECAL?.active || 0} (Active) / ${verticalDataStoreArray[0].ECAL?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].ECAL?.tempClosed || 0} (TempClosed)
NDEL : ${verticalDataStoreArray[0].NDEL?.active || 0} (Active) / ${verticalDataStoreArray[0].NDEL?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].NDEL?.tempClosed || 0} (TempClosed)
NCHA : ${verticalDataStoreArray[0].NCHA?.active || 0} (Active) / ${verticalDataStoreArray[0].NCHA?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].NCHA?.tempClosed || 0} (TempClosed)
NEUP : ${verticalDataStoreArray[0].NEUP?.active || 0} (Active) / ${verticalDataStoreArray[0].NEUP?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].NEUP?.tempClosed || 0} (TempClosed)
WPUN : ${verticalDataStoreArray[0].WPUN?.active || 0} (Active) / ${verticalDataStoreArray[0].WPUN?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].WPUN?.tempClosed || 0} (TempClosed)
NJPR : ${verticalDataStoreArray[0].NJPR?.active || 0} (Active) / ${verticalDataStoreArray[0].NJPR?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].NJPR?.tempClosed || 0} (TempClosed)
SBLR : ${verticalDataStoreArray[0].SBLR?.active || 0} (Active) / ${verticalDataStoreArray[0].SBLR?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].SBLR?.tempClosed || 0} (TempClosed)
NEUP : ${verticalDataStoreArray[0].NEUP?.active || 0} (Active) / ${verticalDataStoreArray[0].NEUP?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].NEUP?.tempClosed || 0} (TempClosed)
SHYD : ${verticalDataStoreArray[0].SHYD?.active || 0} (Active) / ${verticalDataStoreArray[0].SHYD?.inactive || 0} (Inactive) / ${verticalDataStoreArray[0].SHYD?.tempClosed || 0} (TempClosed)
`;
                console.log("\n43 INCH VERTICAL SUMMARY PREVIEW:\n" + verticalMessageBodyNational);
                verticalAllZero = allBranchesZero(verticalDataStoreArray[0], verticalUniqueBranchCodes);
            }

            if (mpduAllZero) {
                console.log("All MPDU branches are 0 (Active) / 0 (Inactive). Stopping script.");
                return;
            }
            if (verticalAllZero) {
                console.log("All 43 Inch Vertical branches are 0 (Active) / 0 (Inactive). Stopping script.");
                return;
            }

            // Generate Excel files and send email
            console.log("\n--- Generating Excel Files and Sending Email (Morning) ---");
            const dailyFilesFolder = path.join(__dirname, 'mpdu-43vertical-daily-files');
            try {
                const squad360FilePath = await generateSquad360Excel(squad360Data, dailyFilesFolder);
                await sendEmailWithAttachments(squad360FilePath);
                console.log("Excel files generated and email sent successfully.\n");
            } catch (error) {
                console.error("Error generating Excel files or sending email:", error);
                // Continue with message sending even if email fails
            }

            await delay(8000);

            await Promise.all([
                sendMpduMorningMessage(mpduDataStoreArray, uniqueBranchCodes),
                send43InchMorningMessage(verticalDataStoreArray, verticalUniqueBranchCodes)
            ]);
        } catch (error) {
            console.error('Error during morning data retrieval:', error);
        }
    }
    console.log("\n=====================================================================");
    console.log(`SCRIPT FINISHED AT: ${moment().tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm A")}`);
    console.log("=====================================================================");
}

startScript();