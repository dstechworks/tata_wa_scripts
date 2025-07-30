const moment = require('moment-timezone');
const { google } = require('googleapis');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: "postgres",
    host: 'db.mgampbhmlnalxohuobpr.supabase.co',
    database: "postgres",
    password: 'gplVhDuxLDMeBKxs',
    port: 5432,
});

// Logger Intialize
const logger = require('./digi_quad_logger');

let baseUrl = process.env.TATA_BASE_URL;
let authToken = process.env.AUTH_TOKEN;

let workbookData = {};

// GOOGLE API VARIABLES
const spreadsheetId = "1aV_JKLR0nPj1HUaVxKr5TVl8OB-9MzR6NV-TfhYaBoQ";

// dates variables
const previousDate = moment().tz("Asia/Kolkata").subtract(1, 'day');
const currentTime = moment().tz("Asia/Kolkata");

// =================================================================================================
// Google Sheets data fetching
// =================================================================================================
async function getBaseDataFromGoogleSheets() {
    const accessGoogleSheet = async () => {
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: "./credentials.json",
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
                const { sheetName, filterStatus } = detail;
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: sheetName,
                });

                const data = response.data.values || [];
                const [headers, ...rows] = data;
                let result = rows.map(row => Object.fromEntries(headers.map((key, index) => [key, row[index]])));
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
            { sheetName: 'Digi-Quad', filterStatus: 'Verified' }
        ]);
    } catch (error) {
        console.error("Error during Google Sheets data retrieval:", error);
        return false;
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

    const response = await pool.query(`SELECT * FROM digiquad_device_records WHERE branch IS NOT NULL AND branch != 'null' AND display_name IS NOT NULL AND verified = 'Yes';`);
    let digiQuadTableData = response.rows;
    let baseDataSheet = workbookData["Digi-Quad"];
    console.log("DIGIQUAD BASE DATA SHEET ::", baseDataSheet ? baseDataSheet?.length : 0);
    console.log("DIGIQUAD RECORD TABLE ::", digiQuadTableData.length);

    if (digiQuadTableData?.length > 0 && baseDataSheet?.length > 0) {

        function findDevices(args) {
            let dataArr = [];

            digiQuadTableData.forEach(x => {
                let filterData = baseDataSheet.find(y =>
                    y['Device ID']?.toString().trim().toLowerCase() === x['display_name']?.toString().trim().toLowerCase()
                );


                if (filterData) {
                    x['Device ID'] = nameHelper(filterData['Device ID']?.trim());
                    x['Dhanush Id'] = nameHelper(filterData['Dhanush Id']);
                    x['Store Name'] = nameHelper(filterData['Store Name']);
                    x['Branch'] = nameHelper(filterData['Branch']?.trim());
                    x['TL Name'] = nameHelper(filterData['TL Name']);
                    x['TL Mobile No'] = numberHelper(filterData['TL Mobile No']);
                    x['AE Name'] = nameHelper(filterData['AE Name']);
                    x['AE Mobile No'] = numberHelper(filterData['AE Mobile No']);
                    x['AM Name'] = nameHelper(filterData['AM Name']);
                    x['AM Mobile No'] = numberHelper(filterData['AM Mobile No']);
                    x['Assistant Name'] = nameHelper(filterData['Assistant Name']);
                    x['Assistant Mobile No'] = numberHelper(filterData['Assistant Mobile No']);
                    x['Assistant 2 Name'] = nameHelper(filterData['Assistant 2 Name']);
                    x['Assistant 2 Mobile No'] = numberHelper(filterData['Assistant 2 Mobile No']);
                }
                if (filterData && (args === "getMatchedDevices")) {
                    dataArr.push(x);
                } else if (!filterData && (args === "getNotMatchedDevices")) {
                    dataArr.push(x);
                }
            })

            return dataArr;
        }

        function mergeAllData() {
            let temp = [];
            // buffer time 12hrs
            const currentDate = new Date(new Date().getTime() - 12 * 60 * 60 * 1000);

            findDevices('getMatchedDevices').forEach(x => {
                if (x?.last_accessed && x?.branch != null) {
                    if (new Date(x.last_accessed) > currentDate) {
                        x['Status'] = 'Active';
                    }
                    if (new Date(x.last_accessed) < currentDate) {
                        x['Status'] = 'InActive';
                    }
                }
                temp.push(x)
            })
            return temp;
        }

        function getDevicesByStatus(args) {
            let temp = []

            mergeAllData().forEach(x => {
                if (x['Status'] == args) {
                    temp.push(x);
                } else if (x['Status'] == args) {
                    temp.push(x);
                }
            })
            return temp
        }

        function delay(milliseconds) {
            return new Promise(resolve => {
                setTimeout(resolve, milliseconds);
            });
        }

        function getAllBranch() {
            let temp = {}
            baseDataSheet.forEach(x => {
                temp[x['Branch']] = {}
            })
            return temp
        }

        function nameHelper(x) {
            if (x && x.toString().trim().length > 0) {
                const name = x.toString().split('/')[0].trim().toUpperCase();
                return name;
            }
            return undefined;
        }

        function numberHelper(x) {
            if (x && x.toString().trim().length >= 10) {
                const number = x.toString().split('/')[0].replace(/[.\s]/g, '').substring(0, 10);
                return number.length === 10 ? number : undefined;
            }
            return undefined;
        }


        function conditionChecker(x) {
            if (nameHelper(x['AM Name']) && numberHelper(x['AM Mobile No']) && nameHelper(x['Assistant Name']) && numberHelper(x['Assistant Mobile No'])) {
                return true;
            } else {
                return false;
            }
        }

        async function requestAxios(config) {
            return await axios.request(config)
                .then((response) => {
                    let apiData = response.data.id;
                    return apiData;
                })
                .catch((error) => {
                    return error
                });
        }

        // National, District, Am, Assistant we have used common templates.

        async function nationalMsg(phoneNum, zone) {
            let variables = JSON.stringify({
                "to": phoneNum,
                "type": "template",
                "template": {
                    "name": "national_common",
                    "language": {
                        "code": "en"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                { "type": "text", "text": "DIGI-QUAD" },
                                { "type": "text", "text": zone.N.active },
                                { "type": "text", "text": zone.N.inactive },
                                { "type": "text", "text": zone.S.active },
                                { "type": "text", "text": zone.S.inactive },
                                { "type": "text", "text": zone.E.active },
                                { "type": "text", "text": zone.E.inactive },
                                { "type": "text", "text": zone.W.active },
                                { "type": "text", "text": zone.W.inactive },
                            ],
                        },
                    ],
                }
            });

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${baseUrl}/whatsapp-cloud/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                data: variables
            };

            let reqAxios = await requestAxios(config);
            return reqAxios;
        }

        async function districtMsg(phoneNum, branchName, total, active, inActive) {
            let variables = JSON.stringify({
                "to": phoneNum,
                "type": "template",
                "template": {
                    "name": "district_common",
                    "language": {
                        "code": "en"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                { "type": "text", "text": "DIGI-QUAD" },
                                { "type": "text", "text": branchName },
                                { "type": "text", "text": total },
                                { "type": "text", "text": active },
                                { "type": "text", "text": inActive },
                            ],
                        },
                    ],
                }
            });

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${baseUrl}/whatsapp-cloud/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                data: variables
            };

            let reqAxios = await requestAxios(config);
            return reqAxios;
        }

        async function am_assistant_msg(phoneNum, sentName, total, active, inActive) {
            let variables = JSON.stringify({
                "to": phoneNum,
                "type": "template",
                "template": {
                    "name": "am_assistant_common",
                    "language": {
                        "code": "en"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                { "type": "text", "text": "DIGI-QUAD" },
                                { "type": "text", "text": sentName },
                                { "type": "text", "text": total },
                                { "type": "text", "text": active },
                                { "type": "text", "text": inActive },
                            ],
                        },
                    ],
                }
            });

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${baseUrl}/whatsapp-cloud/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                data: variables
            };

            let reqAxios = await requestAxios(config);
            return reqAxios;
        }

        async function ae_msg(phoneNum, storeName, dhanushId, tlName, tlNum, storeNum, buttonUrl) {
            let variables = JSON.stringify({
                "to": phoneNum,
                "type": "template",
                "source": "external",
                "template": {
                    "name": "ae_template_for_digi_quad",
                    "language": {
                        "code": "en"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                { "type": "text", "text": storeName },
                                { "type": "text", "text": storeNum },
                                { "type": "text", "text": dhanushId },
                                { "type": "text", "text": "Offline" },
                                { "type": "text", "text": tlName },
                                { "type": "text", "text": tlNum },
                            ],
                        },
                        {
                            "type": "button",
                            "sub_type": "URL",
                            "index": "1",
                            "parameters": [
                                {
                                    "type": "text",
                                    "text": buttonUrl
                                }
                            ]
                        }
                    ],
                }
            });

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${baseUrl}/whatsapp-cloud/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                data: variables
            };

            let reqAxios = await requestAxios(config);
            return reqAxios;
        }

        async function tl_msg(phoneNum, storeName, deviceId, dhanushId, storeNum, buttonUrl) {
            let variables = JSON.stringify({
                "to": phoneNum,
                "type": "template",
                "source": "external",
                "template": {
                    "name": "tl_template_for_digi_quad",
                    "language": {
                        "code": "en"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                { "type": "text", "text": storeName },
                                { "type": "text", "text": storeNum },
                                { "type": "text", "text": deviceId },
                                { "type": "text", "text": dhanushId },
                                { "type": "text", "text": "Offline" },
                            ],
                        },
                        {
                            "type": "button",
                            "sub_type": "URL",
                            "index": "1",
                            "parameters": [
                                {
                                    "type": "text",
                                    "text": buttonUrl
                                }
                            ]
                        }
                    ],
                }
            });

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${baseUrl}/whatsapp-cloud/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                data: variables
            };

            let reqAxios = await requestAxios(config);
            return reqAxios;
        }

        console.log("\n");
        console.table({
            "Total Number of Devices found in Base Sheet ": baseDataSheet.length,
            "Total Number of Devices found in Supabase table ": digiQuadTableData?.length,
            "Data Not Matched with Base sheet ": findDevices('getNotMatchedDevices').length,
            "Data Matched with Base sheet ": findDevices('getMatchedDevices').length,
            "Active Devices ": getDevicesByStatus('Active').length,
            "IActive Devices ": getDevicesByStatus('InActive').length
        })
        console.log("\n");

        let digiQuadTotalCount = 0;
        let AEDevice = {}
        let TLDevice = [];
        let NationalPOCNum = {
            "Hitesh": "8700685675",
            "Dhruv": "8826909378",
            "Sumit": "8920131195",
            "Pratek": "9818429501",
            "Chirag": "9818875211",
            "rusum": "9266903108",
            "Anirban Sen": "9831055203",
            "Nitsh Chabbra": "9712933048",
            "Nalin Kaushik": "9831055468",
            "Gaurav Pundlik": "9831149422",
            "Karan Sehgal": "9953006252",
            "Rishab Agarwal": "9734469759",
            "unknown": "9903955267"
        }
        let DistrictPOCNum = {
            "N": {
                "Amit Sharma": "9878425927",
                "Malika Arjun Kalika": "8123919411",
                "Sumit Bothra": "9831077603"
            },
            "S": {
                "Mr Sudalai Muthu": "9949496708",
                "Vikas": "7483579458",
                "Baker Fen John": "9994810050",
                "Vikram Khosla": "9831055167"
            },
            "E": {
                "Satyendra Singh": "9915440705",
                "Rohan D’Costa": "9007047022",
                "Surajit Ghosh": "8585091444",
                "Vishnu": "9790999093"
            },
            "W": {
                "Pankaj Swahney": "9958899208",
                "Vinit Agarwal": "7087685878",
                "Mudit Bagla": "9831055257"
            }
        }
        let zone = {
            "N": {
                active: 0,
                inactive: 0
            },
            "S": {
                active: 0,
                inactive: 0
            },
            "E": {
                active: 0,
                inactive: 0
            },
            "W": {
                active: 0,
                inactive: 0
            }
        }
        let allBranches = getAllBranch();

        mergeAllData().forEach(x => {
            const aeName = nameHelper(x['AE Name']);
            const assistant1 = nameHelper(x['Assistant Name']);
            const assistant1Mobile = numberHelper(x['Assistant Mobile No']);
            const assistant2 = nameHelper(x['Assistant 2 Name']);
            const assistant2Mobile = numberHelper(x['Assistant 2 Mobile No']);
            const branch = x['Branch'];

            // Initialize branch structure if needed
            if (branch && (!allBranches[branch].active && allBranches[branch].active !== 0)) {
                allBranches[branch].active = 0;
                allBranches[branch].inactive = 0;
                allBranches[branch].total = 0;
            }

            if (branch) allBranches[branch].total++;

            if (x.Status === 'Active') {
                if (branch) allBranches[branch].active++;
            }

            if (x.Status === 'InActive') {
                if (branch) allBranches[branch].inactive++;

                TLDevice.push({
                    'Dhanush Id': x['Dhanush Id'],
                    'Device ID': x['Device ID'],
                    'Store Name': nameHelper(x['Store Name']),
                    'Store Number': numberHelper(x['outlet_contact_number']),
                    'Branch': x['Branch'],
                    'TL Name': nameHelper(x['TL Name']),
                    'TL Mobile No': numberHelper(x['TL Mobile No']),
                    'AE Name': nameHelper(x['AE Name']),
                    'AE Mobile No': numberHelper(x['AE Mobile No']),
                    'AE 2 Name': nameHelper(x['AE 2 Name']),
                    'AE 2 Mobile No': numberHelper(x['AE 2 Mobile No']),
                });
            }

            if (!aeName || !conditionChecker(x)) return;

            // Initialize AE
            if (!AEDevice[aeName]) {
                AEDevice[aeName] = {
                    'Total Count': 0,
                    'Active Count': 0,
                    'InActive Count': 0,
                    'AM': {
                        'Name': nameHelper(x['AM Name']),
                        'Mobile No': numberHelper(x['AM Mobile No'])
                    },
                    'Assistants': {} // now using object for individual count
                };
            }

            AEDevice[aeName]['Total Count']++;
            if (x.Status === 'Active') AEDevice[aeName]['Active Count']++;
            if (x.Status === 'InActive') AEDevice[aeName]['InActive Count']++;

            // Function to update assistant stats
            function updateAssistant(assistantName, mobileNo) {
                if (!assistantName) return;
                if (!AEDevice[aeName]['Assistants'][assistantName]) {
                    AEDevice[aeName]['Assistants'][assistantName] = {
                        'Mobile No': mobileNo,
                        'Total': 0,
                        'Active': 0,
                        'Inactive': 0
                    };
                }

                AEDevice[aeName]['Assistants'][assistantName]['Total']++;
                if (x.Status === 'Active') AEDevice[aeName]['Assistants'][assistantName]['Active']++;
                if (x.Status === 'InActive') AEDevice[aeName]['Assistants'][assistantName]['Inactive']++;
            }

            updateAssistant(assistant1, assistant1Mobile);
            updateAssistant(assistant2, assistant2Mobile);
        });



        for (const property in allBranches) {
            if (allBranches[property].active != undefined || allBranches[property].inactive != undefined) {
                zone[property.substring(0, 1)].active += parseInt(allBranches[property].active)
                zone[property.substring(0, 1)].inactive += parseInt(allBranches[property].inactive)
            }
        }


        // console.log(totalActiveDevices);
        // console.log(totalInActiveDevices);
        // console.log(AEDevice);
        // console.log(allBranches);
        // console.log(zone);




        /////////------------------------------- Send National Message ----------------------------/////////
        let messageBodyNP = `NATIONAL DIGI-QUAD STATUS\nWest : ${zone.W.active} (Active) / ${zone.W.inactive} (Inactive)\nNorth : ${zone.N.active} (Active) / ${zone.N.inactive} (Inactive)\nEast : ${zone.E.active} (Active) / ${zone.E.inactive} (Inactive)\nSouth : ${zone.S.active} (Active) / ${zone.S.inactive} (Inactive)`;
        console.log(messageBodyNP, "\n");

        await delay(7000);

        for (let key in NationalPOCNum) {
            let phoneNum = `+91${NationalPOCNum[key]}`;
            // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);

            let nationalMsgRes = await nationalMsg(phoneNum, zone);
            console.log(`${key} ---> ${nationalMsgRes}`);
            ++digiQuadTotalCount;
            await delay(500);
        }

        console.log("\n");
        console.log('*************************** National Messages Done ************************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", digiQuadTotalCount);
        // await delay(1000);
        

        ////////-------------------------------- Send District Message ----------------------------/////////
        // console.log(allBranches);
        let districtCount = 0;
        for (let key in allBranches) {
            if (allBranches[key]['active']) {
                allBranches[key]["District POC Numbers"] = DistrictPOCNum[`${key[0]}`]
                // console.log(allBranches[key]["District POC Numbers"]);
                for (let pocNum in allBranches[key]["District POC Numbers"]) {
                    districtCount++;
                    let messageBodyDP = `DIGI-QUAD STATUS\nBranch Name: ${key}\nTotal Devices: ${allBranches[key]['total']}\nActive Devices: ${allBranches[key]['active']}\nInactive Devices: ${allBranches[key]['inactive']}`;
                    // console.log(`Branch : ${key} , District POC Name : ${pocNum} , Mobile : ${allBranches[key]["District POC Numbers"][pocNum]}\n`);
                    // console.log(messageBodyDP, "\n");

                    let obj = {
                        "phoneNum": `+91${allBranches[key]["District POC Numbers"][pocNum]}`,
                        "branchName": key,
                        "total": allBranches[key]['total'],
                        "active": allBranches[key]['active'],
                        "inActive": allBranches[key]['inactive']
                    }

                    let districtMsgRes = await districtMsg(obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                    console.log("District --->", districtCount, districtMsgRes, "\n");
                    ++digiQuadTotalCount;
                    await delay(500);

                    // if (districtCount > 0) {
                    //     let districtMsgRes = await districtMsg(obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                    //     console.log("District --->", districtCount, districtMsgRes, "\n");
                    //     ++digiQuadTotalCount;
                    //     await delay(1000);
                    // }
                }
            }
        }

        console.log('*************************** District Messages Done ************************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", digiQuadTotalCount);
        await delay(2000);



        ////////-------------------------------- Send AM & Assistant Message ----------------------------/////////
        // console.log(JSON.stringify(AEDevice, null, 2));
        const AEDeviceEntries = Object.entries(AEDevice);

        for (let i = 0; i < AEDeviceEntries.length; i++) {
            const [aeName, aeData] = AEDeviceEntries[i];

            // ========== AM Message ========== //
            if (aeData.AM?.['Name'] && aeData.AM?.['Mobile No']) {
                const messageBodyAM = `DIGI-QUAD STATUS\nAE Name: ${aeName}\nTotal Devices: ${aeData['Total Count']}\nActive Devices: ${aeData['Active Count']}\nInactive Devices: ${aeData['InActive Count']}`;

                // console.log(`AM Name : ${aeData.AM['Name']} , Mobile : ${aeData.AM['Mobile No']}`);
                // console.log(messageBodyAM, "\n");

                const obj = {
                    phoneNum: `+91${aeData.AM['Mobile No']}`,
                    sentName: aeName,
                    total: aeData['Total Count'],
                    active: aeData['Active Count'],
                    inActive: aeData['InActive Count']
                };

                let amMsgRes = await am_assistant_msg(obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                console.log(i, "AM --->", amMsgRes);
                ++digiQuadTotalCount;
                await delay(500);
            }

            // ========== Assistant Messages ========== //
            const assistants = aeData.Assistants || {};
            for (const [assistantName, assistantData] of Object.entries(assistants)) {
                const messageBodyAssistant = `DIGI-QUAD STATUS\nAE Name: ${aeName}\nAssistant: ${assistantName}\nTotal Devices: ${assistantData.Total}\nActive Devices: ${assistantData.Active}\nInactive Devices: ${assistantData.Inactive}`;

                // console.log(`Assistant Name : ${assistantName} , Mobile : ${assistantData['Mobile No']}`);
                // console.log(messageBodyAssistant, "\n");

                const obj = {
                    phoneNum: `+91${assistantData['Mobile No']}`,
                    sentName: aeName,
                    total: assistantData.Total,
                    active: assistantData.Active,
                    inActive: assistantData.Inactive
                };

                let assistantMsgRes = await am_assistant_msg(obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                console.log(i, "Assistant --->", assistantMsgRes);
                ++digiQuadTotalCount;
                await delay(500);
            }
        }

        console.log('************************ AM & Assistant Messages Done ***********************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", digiQuadTotalCount);
        await delay(2000);



        ////////-------------------------------- Send AE and TL Message ----------------------------/////////
        // console.log(TLDevice)
        for (let i = 0; i < TLDevice.length; i++) {
            const x = TLDevice[i];
            // console.log("Branch :: ", x['Branch']);

            if (x['Store Name'] && x['Store Number'] && x['Branch'] && x['Device ID']) {
                // Ae Logic
                if (x['AE Name'] && x['AE Mobile No'] && x['TL Name'] && x['TL Mobile No']) {
                    let messageBodyAE = `Hi ! DIGI-QUAD is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${x['TL Mobile No']}\nStore Number: ${x['Store Number']}`;
                    // console.log(`${x['AE Mobile No']}`, "\n")
                    // console.log(messageBodyAE)

                    let obj = {
                        "phoneNum": `+91${x['AE Mobile No']}`,
                        "storeName": x['Store Name'],
                        "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                        "tlName": x['TL Name'],
                        "tlNum": x['TL Mobile No'],
                        "storeNum": x['Store Number'],
                        "buttonUrl": `complaint.html?storename=${(x['Store Name']).toString().split(' ').join('')}&name=${(x['AE Name']).split(' ').join('')}&number=${x['AE Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=digiQuad`
                    }

                    let aeMsgRes = await ae_msg(obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                    console.log(i, "AE --->", aeMsgRes);
                    ++digiQuadTotalCount;
                    await delay(500);
                }

                // Ae 2 Logic
                if (x['AE 2 Name'] && x['AE 2 Mobile No'] && x['TL Name'] && x['TL Mobile No']) {
                    let messageBodyAE2 = `Hi ! DIGI-QUAD is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${x['TL Mobile No']}\nStore Number: ${x['Store Number']}`;
                    // console.log(`${x['AE Mobile No']}`, "\n")
                    // console.log(messageBodyAE2)

                    let obj = {
                        "phoneNum": `+91${x['AE 2 Mobile No']}`,
                        "storeName": x['Store Name'],
                        "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                        "tlName": x['TL Name'],
                        "tlNum": x['TL Mobile No'],
                        "storeNum": x['Store Number'],
                        "buttonUrl": `complaint.html?storename=${(x['Store Name']).toString().split(' ').join('')}&name=${(x['AE 2 Name']).split(' ').join('')}&number=${x['AE 2 Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=digiQuad`
                    }

                    let ae2MsgRes = await ae_msg(obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                    console.log(i, "AE --->", ae2MsgRes);
                    ++digiQuadTotalCount;
                    await delay(500);
                }

                // Tl Logic
                if (x['TL Name'] && x['TL Mobile No']) {
                    let messageBodyTL = `Hi ! DIGI-QUAD is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nStore Number: ${x['Store Number']}`;
                    // console.log(`${x['TL Mobile No']}`, "\n")
                    // console.log(messageBodyTL)

                    let obj = {
                        "phoneNum": `+91${x['TL Mobile No']}`,
                        "storeName": x['Store Name'],
                        "deviceId": x['Device ID'],
                        "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                        "storeNum": x['Store Number'],
                        "buttonUrl": `complaint.html?storename=${(x['Store Name']).toString().split(' ').join('')}&name=${(x['TL Name']).split(' ').join('')}&number=${x['TL Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=digiQuad`
                    }

                    let tlMsgRes = await tl_msg(obj.phoneNum, obj.storeName, obj.deviceId, obj.dhanushId, obj.storeNum, obj.buttonUrl);
                    console.log(i, "TL --->", tlMsgRes);
                    ++digiQuadTotalCount;
                    await delay(500);
                }
            }
        }

        console.log('*************************** AE and TL Messages Done ************************', "\n");
        console.log("-------------------------- All Messages Sent Successful --------------------");
        console.log("TOTAL MESSAGE COUNT = ", digiQuadTotalCount);

    }

    console.log("\n=====================================================================");
    console.log(`SCRIPT FINISHED AT: ${moment().tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm A")}`);
    console.log("=====================================================================");
}

startScript();
