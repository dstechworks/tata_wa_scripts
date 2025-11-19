const { mpduNationalMsg, mpduBranchMsg, vertical43InchNationalMsg, vertical43InchBranchMsg } = require('../utils/whatsappMsgTempUtils');
const { mpduBranchWisePOCNum } = require('../utils/constants');
const { delay } = require('../utils/helpers');
const querystring = require('querystring');
const moment = require('moment-timezone');
const { google } = require('googleapis');
const { Pool } = require('pg');
const axios = require('axios');
const path = require('path');

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
    "Rohan": "9888311338",
    "Narender Kumar": "9891493671"
}
let eveningBranchNum = {
    "Hitesh": "8700685675",
    "Dhruv": "8826909378",
    "Sandip": "9319798915",
    "Rusum": "9266903108",
    "Rohan": "9888311338",
    "Narender Kumar": "9891493671"
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
async function sendMpduMorningMessage(dbData, squad360Data = []) {
    console.log("\n--- Starting MPDU Morning Report ---");
    if (workbookData['All Device'] && workbookData['All Device'].length > 0 && dbData.length > 0) {
        let dataStoreArray = [{ "national": { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0 } }];
        const uniqueBranchCodes = getUniqueByKey(workbookData['All Device'], 'Branch Code');
        uniqueBranchCodes.forEach(branch => {
            dataStoreArray[0][branch] = { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0, "inActiveOutletList": "", "tempClosedOutletList": "" };
        });

        if (uniqueBranchCodes.length == 21) {
            workbookData['All Device'].forEach(deviceIdElement => {
                const findDeviceByTechworksId = dbData.find(d => d.display_name == deviceIdElement['Techworks ID']);
                const branchCode = deviceIdElement['Branch Code'];

                if (findDeviceByTechworksId) {
                    const onlineDevice = dbData.find(d => d.display_name.replace(/\s*(\(new\)|\t)\s*/gi, '') == deviceIdElement['Techworks ID'] && Number(d.display_count) > 0);
                    const outletName = deviceIdElement['Outlet Name'].trim();

                    if (onlineDevice) {
                        dataStoreArray[0][branchCode].active += 1;
                        dataStoreArray[0].national.active += 1;
                    } else {
                        dataStoreArray[0][branchCode].inactive += 1;
                        dataStoreArray[0][branchCode].inActiveOutletList = dataStoreArray[0][branchCode].inActiveOutletList ? dataStoreArray[0][branchCode].inActiveOutletList + `, ${outletName}` : outletName;
                        dataStoreArray[0].national.inactive += 1;
                    }
                    dataStoreArray[0][branchCode].total += 1;
                    dataStoreArray[0].national.total += 1;
                }
            });

            // Populate tempClosedOutletList and count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
            workbookData['All Device'].forEach(deviceIdElement => {
                const branchCode = deviceIdElement['Branch Code'];
                const currentStatus = deviceIdElement['Current Status'];
                const outletName = deviceIdElement['Outlet Name']?.trim();

                if (currentStatus === 'Verified & Temp Closed' && outletName && dataStoreArray[0][branchCode]) {
                    dataStoreArray[0][branchCode].tempClosed += 1;
                    dataStoreArray[0].national.tempClosed += 1;
                    dataStoreArray[0][branchCode].tempClosedOutletList = dataStoreArray[0][branchCode].tempClosedOutletList
                        ? dataStoreArray[0][branchCode].tempClosedOutletList + `, ${outletName}`
                        : outletName;
                }
            });

            // Add Squad360 data to national counts (reusing fetched data)
            let squad360Active = 0;
            let squad360Inactive = 0;
            if (squad360Data.length > 0) {
                squad360Data.forEach(screen => {
                    if (screen.isActive === 'Active') {
                        dataStoreArray[0].national.active += 1;
                        squad360Active += 1;
                    } else {
                        dataStoreArray[0].national.inactive += 1;
                        squad360Inactive += 1;
                    }
                    dataStoreArray[0].national.total += 1;
                });
            }


            console.log("Sending MPDU National Messages...");
            for (let key in NationalPOCNum) {
                let phoneNum = `+91${NationalPOCNum[key]}`;
                let nationalMsgRes = await mpduNationalMsg("national_temp_for_mpdu", phoneNum, dataStoreArray);
                console.log(`MPDU National: ${key} ---> ${nationalMsgRes}`);
                await delay(500);
            }

            await delay(5000);

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
        } else {
            console.log("MPDU: BRANCH COUNT NOT MATCHED");
        }
    } else {
        console.log("MPDU: NOT FIND DATA LENGTH OF DATA GET FROM DB OR GOOGLE SHEETS");
    }
}

async function sendMpduEveningMessage(apiData, squad360Data = []) {
    console.log("\n--- Starting MPDU Evening Report ---");

    const targetBranches = ["SBLR", "WPUN", "SCHE", "NDEL"]; // ✅ dynamic

    if (workbookData['All Device']?.length > 0 && apiData.length > 0) {

        let dataStoreArray = [{ national: { active: 0, inactive: 0, tempClosed: 0, total: 0 } }];

        const uniqueBranchCodes = getUniqueByKey(workbookData['All Device'], 'Branch Code');

        // Initialize branch data
        targetBranches.forEach(branch => {
            if (uniqueBranchCodes.includes(branch)) {
                dataStoreArray[0][branch] = { active: 0, inactive: 0, tempClosed: 0, total: 0, inActiveOutletList: "", tempClosedOutletList: "" };
            }
        });

        // Count active/inactive
        workbookData['All Device'].forEach(deviceIdElement => {
            const branchCode = deviceIdElement['Branch Code'];
            if (targetBranches.includes(branchCode)) {
                const findDeviceByTechworksId = apiData.find(d => d.display == deviceIdElement['Techworks ID']);
                if (findDeviceByTechworksId) {
                    const onlineDevice = apiData.find(
                        d => d.display.replace(/\s*(\(new\)|\t)\s*/gi, '') == deviceIdElement['Techworks ID'] && d.loggedIn == 1
                    );
                    const outletName = deviceIdElement['Outlet Name'].trim();

                    if (onlineDevice) {
                        dataStoreArray[0][branchCode].active++;
                    } else {
                        dataStoreArray[0][branchCode].inactive++;
                        dataStoreArray[0][branchCode].inActiveOutletList = dataStoreArray[0][branchCode].inActiveOutletList ? dataStoreArray[0][branchCode].inActiveOutletList + `, ${outletName}` : outletName;
                    }
                }
            }
        });

        // Populate tempClosedOutletList and count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
        workbookData['All Device'].forEach(deviceIdElement => {
            const branchCode = deviceIdElement['Branch Code'];
            const currentStatus = deviceIdElement['Current Status'];
            const outletName = deviceIdElement['Outlet Name']?.trim();

            if (currentStatus === 'Verified & Temp Closed' && outletName && targetBranches.includes(branchCode) && dataStoreArray[0][branchCode]) {
                dataStoreArray[0][branchCode].tempClosed += 1;
                dataStoreArray[0].national.tempClosed += 1;
                dataStoreArray[0][branchCode].tempClosedOutletList = dataStoreArray[0][branchCode].tempClosedOutletList
                    ? dataStoreArray[0][branchCode].tempClosedOutletList + `, ${outletName}`
                    : outletName;
            }
        });

        // Add Squad360 data to national counts (reusing fetched data)
        let squad360Active = 0;
        let squad360Inactive = 0;
        if (squad360Data.length > 0) {
            squad360Data.forEach(screen => {
                if (screen.isActive === 'Active') {
                    dataStoreArray[0].national.active += 1;
                    squad360Active += 1;
                } else {
                    dataStoreArray[0].national.inactive += 1;
                    squad360Inactive += 1;
                }
                dataStoreArray[0].national.total += 1;
            });
            console.log(`SQUAD-360: Added ${squad360Data.length} devices (${squad360Active} Active / ${squad360Inactive} Inactive) to national counts`);
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
            if (branch === "SCHE" || branch === "WPUN") {
                for (const pocName in mpduBranchWisePOCNum[branch]) {
                    let phoneNum = `+91${mpduBranchWisePOCNum[branch][pocName]}`;
                    let res = await mpduBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `MPDU - ${branch}`, dataStoreArray[0][branch], inActiveOutletListStr, tempClosedOutletListStr);
                    console.log(`MPDU ${branch}: ${pocName} ---> ${res}`);
                    await delay(500);
                }
            }
        }
    } else {
        console.log("MPDU: NOT FIND DATA LENGTH OF DATA GET FROM API OR GOOGLE SHEETS");
    }
}

// =================================================================================================
// --- 43 INCH VERTICAL SCRIPT ---
// =================================================================================================
async function send43InchMorningMessage(dbData) {
    console.log("\n--- Starting 43 Inch Vertical Morning Report ---");
    if (workbookData['43 Inch Vertical'] && workbookData['43 Inch Vertical'].length > 0 && dbData.length > 0) {
        let dataStoreArray = [{ "national": { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0 } }];
        const uniqueBranchCodes = getUniqueByKey(workbookData['43 Inch Vertical'], 'Branch Code');
        uniqueBranchCodes.forEach(branch => {
            dataStoreArray[0][branch] = { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0, "inActiveOutletList": "", "tempClosedOutletList": "" };
        });

        if (uniqueBranchCodes.length == 9) {
            workbookData['43 Inch Vertical'].forEach(deviceIdElement => {
                const findDeviceByTechworksId = dbData.find(d => d.display_name == deviceIdElement['Techworks ID']);
                const branchCode = deviceIdElement['Branch Code'];

                if (findDeviceByTechworksId) {
                    const onlineDevice = dbData.find(d => d.display_name == deviceIdElement['Techworks ID'] && d.display_count > 0);
                    const outletName = deviceIdElement['Outlet Name'].trim();

                    if (onlineDevice) {
                        dataStoreArray[0][branchCode].active += 1;
                        dataStoreArray[0].national.active += 1;
                    } else {
                        dataStoreArray[0][branchCode].inactive += 1;
                        dataStoreArray[0][branchCode].inActiveOutletList = dataStoreArray[0][branchCode].inActiveOutletList ? dataStoreArray[0][branchCode].inActiveOutletList + `, ${outletName}` : outletName;
                        dataStoreArray[0].national.inactive += 1;
                    }
                    dataStoreArray[0][branchCode].total += 1;
                    dataStoreArray[0].national.total += 1;
                }
            });

            // Populate tempClosedOutletList and count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
            workbookData['43 Inch Vertical'].forEach(deviceIdElement => {
                const branchCode = deviceIdElement['Branch Code'];
                const currentStatus = deviceIdElement['Current Status'];
                const outletName = deviceIdElement['Outlet Name']?.trim();

                if (currentStatus === 'Verified & Temp Closed' && outletName && dataStoreArray[0][branchCode]) {
                    dataStoreArray[0][branchCode].tempClosed += 1;
                    dataStoreArray[0].national.tempClosed += 1;
                    dataStoreArray[0][branchCode].tempClosedOutletList = dataStoreArray[0][branchCode].tempClosedOutletList
                        ? dataStoreArray[0][branchCode].tempClosedOutletList + `, ${outletName}`
                        : outletName;
                }
            });

            console.log("Sending 43 Inch Vertical National Messages...");
            for (let key in NationalPOCNum) {
                let phoneNum = `+91${NationalPOCNum[key]}`;
                let nationalMsgRes = await vertical43InchNationalMsg("national_temp_for_43vertical", phoneNum, dataStoreArray);
                console.log(`43 Inch: ${key} ---> ${nationalMsgRes}`);
                await delay(500);
            }

            await delay(5000);

            console.log("Sending 43 Inch Vertical Branch Messages...");
            for (const branch of uniqueBranchCodes) {
                if (mpduBranchWisePOCNum[branch]) {
                    const branchCounts = dataStoreArray[0][branch];
                    for (const pocName in mpduBranchWisePOCNum[branch]) {
                        let phoneNum = `+91${mpduBranchWisePOCNum[branch][pocName]}`;
                        let inActiveOutletListStr = isEmpty(branchCounts.inActiveOutletList) ? "No inactive outlet list found" : branchCounts.inActiveOutletList;
                        let tempClosedOutletListStr = isEmpty(branchCounts.tempClosedOutletList) ? "No temporarily closed outlet list found" : branchCounts.tempClosedOutletList;
                        let branchMsgRes = await vertical43InchBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `43 VERTICAL - ${branch}`, branchCounts, inActiveOutletListStr, tempClosedOutletListStr);
                        console.log(`43 Inch Branch: ${pocName} - ${branch} ---> ${branchMsgRes}`);
                        await delay(500);
                    }
                }
            }
        } else {
            console.log("43 Inch: BRANCH COUNT NOT MATCHED");
        }
    } else {
        console.log("43 Inch: NOT FIND DATA LENGTH OF DATA GET FROM DB OR GOOGLE SHEETS");
    }
}

async function send43InchEveningMessage(apiData) {
    console.log("\n--- Starting 43 Inch Vertical Evening Report ---");

    if (!workbookData['43 Inch Vertical'] || workbookData['43 Inch Vertical'].length === 0 || apiData.length === 0) {
        console.log("43 Inch: No data found in API or Google Sheets");
        return;
    }

    const targetBranches = ["SBLR", "WPUN", "NDEL"];
    let dataStoreArray = [{ "national": { active: 0, inactive: 0, tempClosed: 0, total: 0 } }];

    // Initialize data for each target branch
    targetBranches.forEach(branch => {
        dataStoreArray[0][branch] = { active: 0, inactive: 0, tempClosed: 0, total: 0, inActiveOutletList: "", tempClosedOutletList: "" };
    });

    // Count active/inactive for each branch
    workbookData['43 Inch Vertical'].forEach(device => {
        const branchCode = device['Branch Code'];
        if (targetBranches.includes(branchCode)) {
            const deviceInApi = apiData.find(d => d.display == device['Techworks ID']);
            if (deviceInApi) {
                const onlineDevice = apiData.find(
                    d => d.display.replace(/\s*(\(new\)|\t)\s*/gi, '') == device['Techworks ID'] && d.loggedIn == 1
                );
                const outletName = device['Outlet Name'].trim();

                if (onlineDevice) {
                    dataStoreArray[0][branchCode].active += 1;
                } else {
                    dataStoreArray[0][branchCode].inactive += 1;
                    dataStoreArray[0][branchCode].inActiveOutletList = dataStoreArray[0][branchCode].inActiveOutletList ? dataStoreArray[0][branchCode].inActiveOutletList + `, ${outletName}` : outletName;
                }
            }
        }
    });

    // Populate tempClosedOutletList and count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
    workbookData['43 Inch Vertical'].forEach(deviceIdElement => {
        const branchCode = deviceIdElement['Branch Code'];
        const currentStatus = deviceIdElement['Current Status'];
        const outletName = deviceIdElement['Outlet Name']?.trim();

        if (currentStatus === 'Verified & Temp Closed' && outletName && targetBranches.includes(branchCode) && dataStoreArray[0][branchCode]) {
            dataStoreArray[0][branchCode].tempClosed += 1;
            dataStoreArray[0].national.tempClosed += 1;
            dataStoreArray[0][branchCode].tempClosedOutletList = dataStoreArray[0][branchCode].tempClosedOutletList
                ? dataStoreArray[0][branchCode].tempClosedOutletList + `, ${outletName}`
                : outletName;
        }
    });

    // Send messages for each branch using single eveningBranchNum list
    for (const branch of targetBranches) {
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
        if (branch === "WPUN") {
            for (const pocName in mpduBranchWisePOCNum[branch]) {
                let phoneNum = `+91${mpduBranchWisePOCNum[branch][pocName]}`;
                let msgRes = await vertical43InchBranchMsg("mpdu_43vertical_branch_temp_2", phoneNum, `43 VERTICAL - ${branch}`, dataStoreArray[0][branch], inActiveOutletListStr, tempClosedOutletListStr);
                console.log(`43 Inch ${branch}: ${pocName} ---> ${msgRes}`);
                await delay(500);
            }
        }
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

    // Fetch Squad360 data once and reuse it
    console.log("Fetching SQUAD-360 data...");
    const squad360Data = await getSquad360Data();
    console.log(`SQUAD-360: Fetched ${squad360Data.length} devices`);

    const currentHour = currentTime.hour();
    if (currentHour >= 15) {
        console.log(`\nIt's evening time, script run.`);
        console.log(`EVENING DATA GET DATE :- ${currentTime.format("YYYY-MM-DD")}`, "\n");
        try {
            console.log('Getting initial tokens...');
            await getAccessToken(1);

            console.log('Processing Server 1...');
            const server1Results = await getApiData(1);
            const apiData = server1Results.map(item => ({ ...item, sourceServer: 1 }));
            console.log(`Total combined results from APIs: ${apiData.length}`);

            // Define branch codes for MPDU and 43 Vertical
            const mpduBranches = ["SBLR", "WPUN", "SCHE", "NDEL"];
            const verticalBranches = ["SBLR", "WPUN", "NDEL"];

            // Function to calculate active/inactive for any branch array
            function getBranchStatus(sheetName, branches) {
                let status = {};
                branches.forEach(code => status[code] = { active: 0, inactive: 0 });

                if (workbookData[sheetName] && workbookData[sheetName].length > 0 && apiData.length > 0) {
                    workbookData[sheetName].forEach(device => {
                        const branchCode = device["Branch Code"];
                        if (branches.includes(branchCode)) {
                            const deviceInApi = apiData.find(d => d.display == device["Techworks ID"]);
                            if (deviceInApi) {
                                const isOnline = apiData.find(d =>
                                    d.display.replace(/\s*(\(new\)|\t)\s*/gi, '') == device["Techworks ID"] &&
                                    d.loggedIn == 1
                                );
                                if (isOnline) status[branchCode].active++;
                                else status[branchCode].inactive++;
                            }
                        }
                    });
                }
                return status;
            }

            // Get status for MPDU and 43 Inch Vertical
            const mpduStatus = getBranchStatus("All Device", mpduBranches);
            const verticalStatus = getBranchStatus("43 Inch Vertical", verticalBranches);

            // Display demo messages
            console.log("\n--- MPDU EVENING STATUS ---");
            Object.entries(mpduStatus).forEach(([branch, counts]) => {
                console.log(`${branch} : ${counts.active} (Active) / ${counts.inactive} (Inactive)`);
            });

            console.log("\n--- 43 INCH VERTICAL EVENING STATUS ---");
            Object.entries(verticalStatus).forEach(([branch, counts]) => {
                console.log(`${branch} : ${counts.active} (Active) / ${counts.inactive} (Inactive)`);
            });

            // Stop script if all zero
            if (Object.values(mpduStatus).every(c => c.active === 0 && c.inactive === 0)) {
                console.log("All MPDU branches are 0 (Active) / 0 (Inactive). Stopping script.");
                process.exit(0);
            }
            if (Object.values(verticalStatus).every(c => c.active === 0 && c.inactive === 0)) {
                console.log("All 43 Inch Vertical branches are 0 (Active) / 0 (Inactive). Stopping script.");
                process.exit(0);
            }

            await delay(8000);
            await sendMpduEveningMessage(apiData, squad360Data);
            await send43InchEveningMessage(apiData);

        } catch (error) {
            console.error('Error during evening data retrieval:', error);
        }
    } else {
        console.log(`\nIt's morning time, script run.`);
        console.log(`MORNING DATA GET DATE :- ${previousDate.format("YYYY-MM-DD")}`, "\n");
        try {
            const dbResponse = await pool.query(`select * from display_data_table where custom_date = '${previousDate.format("YYYY-MM-DD")}'`);
            console.log("Data From display_data_table ::", dbResponse.rows.length);

            // Build and print MPDU message body summary
            let mpduDataStoreArray = [{ "national": { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0 } }];
            let mpduAllZero = false;
            if (workbookData['All Device'] && workbookData['All Device'].length > 0 && dbResponse.rows.length > 0) {
                const uniqueBranchCodes = getUniqueByKey(workbookData['All Device'], 'Branch Code');
                uniqueBranchCodes.forEach(branch => {
                    mpduDataStoreArray[0][branch] = { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0, "inActiveOutletList": "" };
                });
                workbookData['All Device'].forEach(deviceIdElement => {
                    const findDeviceByTechworksId = dbResponse.rows.find(d => d.display_name == deviceIdElement['Techworks ID']);
                    const branchCode = deviceIdElement['Branch Code'];
                    if (findDeviceByTechworksId) {
                        const onlineDevice = dbResponse.rows.find(d => d.display_name.replace(/\s*(\(new\)|\t)\s*/gi, '') == deviceIdElement['Techworks ID'] && Number(d.display_count) > 0);
                        if (onlineDevice) {
                            mpduDataStoreArray[0][branchCode].active += 1;
                            mpduDataStoreArray[0].national.active += 1;
                        } else {
                            mpduDataStoreArray[0][branchCode].inactive += 1;
                            mpduDataStoreArray[0].national.inactive += 1;
                        }
                        mpduDataStoreArray[0][branchCode].total += 1;
                        mpduDataStoreArray[0].national.total += 1;
                    }
                });

                // Count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
                workbookData['All Device'].forEach(deviceIdElement => {
                    const branchCode = deviceIdElement['Branch Code'];
                    const currentStatus = deviceIdElement['Current Status'];
                    if (currentStatus === 'Verified & Temp Closed' && mpduDataStoreArray[0][branchCode]) {
                        mpduDataStoreArray[0][branchCode].tempClosed += 1;
                        mpduDataStoreArray[0].national.tempClosed += 1;
                    }
                });

                // Add Squad360 data to preview (reusing fetched data)
                let squad360PreviewActive = 0;
                let squad360PreviewInactive = 0;
                if (squad360Data.length > 0) {
                    squad360Data.forEach(screen => {
                        if (screen.isActive === 'Active') {
                            mpduDataStoreArray[0].national.active += 1;
                            squad360PreviewActive += 1;
                        } else {
                            mpduDataStoreArray[0].national.inactive += 1;
                            squad360PreviewInactive += 1;
                        }
                        mpduDataStoreArray[0].national.total += 1;
                    });
                }

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

            // Build and print 43 Inch Vertical message body summary
            let verticalDataStoreArray = [{ "national": { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0 } }];
            let verticalAllZero = false;
            if (workbookData['43 Inch Vertical'] && workbookData['43 Inch Vertical'].length > 0 && dbResponse.rows.length > 0) {
                const uniqueBranchCodes = getUniqueByKey(workbookData['43 Inch Vertical'], 'Branch Code');
                uniqueBranchCodes.forEach(branch => {
                    verticalDataStoreArray[0][branch] = { "active": 0, "inactive": 0, "tempClosed": 0, "total": 0, "inActiveOutletList": "" };
                });
                workbookData['43 Inch Vertical'].forEach(deviceIdElement => {
                    const findDeviceByTechworksId = dbResponse.rows.find(d => d.display_name == deviceIdElement['Techworks ID']);
                    const branchCode = deviceIdElement['Branch Code'];
                    if (findDeviceByTechworksId) {
                        const onlineDevice = dbResponse.rows.find(d => d.display_name == deviceIdElement['Techworks ID'] && d.display_count > 0);
                        if (onlineDevice) {
                            verticalDataStoreArray[0][branchCode].active += 1;
                            verticalDataStoreArray[0].national.active += 1;
                        } else {
                            verticalDataStoreArray[0][branchCode].inactive += 1;
                            verticalDataStoreArray[0].national.inactive += 1;
                        }
                        verticalDataStoreArray[0][branchCode].total += 1;
                        verticalDataStoreArray[0].national.total += 1;
                    }
                });

                // Count tempClosed from Google Sheets data where Current Status = "Verified & Temp Closed"
                workbookData['43 Inch Vertical'].forEach(deviceIdElement => {
                    const branchCode = deviceIdElement['Branch Code'];
                    const currentStatus = deviceIdElement['Current Status'];
                    if (currentStatus === 'Verified & Temp Closed' && verticalDataStoreArray[0][branchCode]) {
                        verticalDataStoreArray[0][branchCode].tempClosed += 1;
                        verticalDataStoreArray[0].national.tempClosed += 1;
                    }
                });

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
                verticalAllZero = allBranchesZero(verticalDataStoreArray[0], uniqueBranchCodes);
            }

            if (mpduAllZero) {
                console.log("All MPDU branches are 0 (Active) / 0 (Inactive). Stopping script.");
                process.exit(0);
            }
            if (verticalAllZero) {
                console.log("All 43 Inch Vertical branches are 0 (Active) / 0 (Inactive). Stopping script.");
                process.exit(0);
            }

            await delay(8000);

            await sendMpduMorningMessage(dbResponse.rows, squad360Data);
            await send43InchMorningMessage(dbResponse.rows);
        } catch (error) {
            console.error('Error during morning data retrieval:', error);
        }
    }
    console.log("\n=====================================================================");
    console.log(`SCRIPT FINISHED AT: ${moment().tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm A")}`);
    console.log("=====================================================================");
}

startScript();