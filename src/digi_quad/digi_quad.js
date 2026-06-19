const { nationalMsg, districtMsg, am_assistant_msg, ae_msg_digi_quad, tl_msg_digi_quad } = require('../utils/whatsappMsgTempUtils.js');
const { delay, nameHelper, numberHelper, numbersHelper, areAllZonesZero, conditionCheckerHelper, naValueHelper, isNaValueFoundHelper, spaceCheckerHelper } = require('../utils/helpers.js');
const moment = require('moment-timezone');
const { google } = require('googleapis');
const { Pool } = require('pg');
const path = require('path');


const pool = new Pool({
    user: "postgres",
    host: 'db.mgampbhmlnalxohuobpr.supabase.co',
    database: "postgres",
    password: 'gplVhDuxLDMeBKxs',
    port: 5432,
});

// Logger Intialize
const logger = require('./digi_quad_logger');


// GOOGLE API VARIABLES
const spreadsheetId = "1aV_JKLR0nPj1HUaVxKr5TVl8OB-9MzR6NV-TfhYaBoQ";
let workbookData = {};
let isMessageSent = true;

// dates variables
const previousDate = moment().tz("Asia/Kolkata").subtract(1, 'day');
const currentTime = moment().tz("Asia/Kolkata");

// =================================================================================================
// Google Sheets data fetching
// =================================================================================================
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
                    x['Device ID'] = filterData['Device ID']?.trim();
                    x['Dhanush Id'] = naValueHelper(filterData['Dhanush Id']);
                    x['Store Name'] = naValueHelper(filterData['Store Name']);
                    x['Branch'] = naValueHelper(filterData['Branch']?.trim());
                    x['TL Name'] = nameHelper(filterData['TL Name']);
                    x['TL Mobile No'] = filterData['TL Mobile No']; // Store raw value for numbersHelper
                    x['AE Name'] = nameHelper(filterData['AE Name']);
                    x['AE Mobile No'] = filterData['AE Mobile No']; // Store raw value for numbersHelper
                    x['AM Name'] = nameHelper(filterData['AM Name']);
                    x['AM Mobile No'] = filterData['AM Mobile No']; // Store raw value for numbersHelper
                    x['Assistant Name'] = nameHelper(filterData['Assistant Name']);
                    x['Assistant Mobile No'] = filterData['Assistant Mobile No']; // Store raw value for numbersHelper
                    x['Assistant 2 Name'] = nameHelper(filterData['Assistant 2 Name']);
                    x['Assistant 2 Mobile No'] = filterData['Assistant 2 Mobile No']; // Store raw value for numbersHelper
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

        function getAllBranch() {
            let temp = {}
            baseDataSheet.forEach(x => {
                temp[x['Branch']] = {}
            })
            return temp
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
            // "Hitesh": "8700685675",
            // "Dhruv": "8826909378",
            // "Sumit": "8920131195",
            // "Pratek": "9818429501",
            // "rusum": "9266903108",
            // "Anirban Sen": "9831055203",
            // "Nitsh Chabbra": "9712933048",
            // "Nalin Kaushik": "9831055468",
            // "Gaurav Pundlik": "9831149422",
            // "Rishab Agarwal": "9734469759",
            // "Milan Anandan": "9903955267"
            // "Priyank Maheshwari": "9893558458",
        }
        let techworksTeamHeadNum = {
            "Hitesh": "8700685675",
            "Dhruv": "8826909378",
            "Sumit": "8920131195",
            "Pratek": "9818429501",
            "rusum": "9266903108",
        }
        let DistrictPOCNum = {
            "N": {
                "Malika Arjun Kalika": "8123919411",
                "Sumit Bothra": "9831077603"
            },
            "S": {
                "Mr Sudalai Muthu": "9949496708",
                "Vikas": "7483579458",
                "Baker Fen John": "9994810050"
            },
            "E": {
                "Satyendra Singh": "9915440705",
                "Rohan D’Costa": "9007047022",
                "Surajit Ghosh": "8585091444",
                "Vishnu": "9790999093"
            },
            "W": {
                "Pankaj Swahney": "9958899208",
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
            const assistant1Mobile = x['Assistant Mobile No']; // Store raw value for numbersHelper
            const assistant2 = nameHelper(x['Assistant 2 Name']);
            const assistant2Mobile = x['Assistant 2 Mobile No']; // Store raw value for numbersHelper
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
                    'Dhanush Id': naValueHelper(x['Dhanush Id']),
                    'Device ID': x['Device ID'],
                    'Store Name': naValueHelper(x['Store Name']),
                    'Store Number': naValueHelper(x['outlet_contact_number']),
                    'Branch': naValueHelper(x['Branch']),
                    'TL Name': nameHelper(x['TL Name']),
                    'TL Mobile No': x['TL Mobile No'], // Store raw value for numbersHelper
                    'AE Name': nameHelper(x['AE Name']),
                    'AE Mobile No': x['AE Mobile No'], // Store raw value for numbersHelper
                    'AE 2 Name': nameHelper(x['AE 2 Name']),
                    'AE 2 Mobile No': x['AE 2 Mobile No'], // Store raw value for numbersHelper
                });
            }

            if (!aeName || !conditionCheckerHelper(x)) return;

            // Initialize AE
            if (!AEDevice[aeName]) {
                AEDevice[aeName] = {
                    'Total Count': 0,
                    'Active Count': 0,
                    'InActive Count': 0,
                    'AM': {
                        'Name': nameHelper(x['AM Name']),
                        'Mobile No': x['AM Mobile No'] // Store raw value for numbersHelper
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
        // console.log(TLDevice)



        /////////------------------------------- Send National Message ----------------------------/////////
        let messageBodyNP = `NATIONAL DIGI-QUAD STATUS
North : ${zone.N.active} (Active) / ${zone.N.inactive} (Inactive)
South : ${zone.S.active} (Active) / ${zone.S.inactive} (Inactive)
East  : ${zone.E.active} (Active) / ${zone.E.inactive} (Inactive)
West  : ${zone.W.active} (Active) / ${zone.W.inactive} (Inactive)`;
        console.log(messageBodyNP, "\n");

        if (areAllZonesZero(zone)) {
            console.log('All zones have zero active/inactive counts - stopping script');
            return;
        }

        if (isMessageSent) {
            await delay(7000);
        }

        // for (let key in NationalPOCNum) {
        //     let phoneNum = `+91${NationalPOCNum[key]}`;
        //     // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);

        //     if (isMessageSent) {
        //         let nationalMsgRes = await nationalMsg("national_common", "DIGI-QUAD", phoneNum, zone);
        //         console.log(`${key} ---> ${nationalMsgRes}`);
        //         ++digiQuadTotalCount;
        //         await delay(500);
        //     }
        // }

        // console.log("\n");
        // console.log('*************************** National Messages Done ************************', "\n");
        // console.log("TOTAL MESSAGE COUNT = ", digiQuadTotalCount);
        // if (isMessageSent) {
        //     await delay(1000);
        // }


        ////////-------------------------------- Send District Message ----------------------------/////////
        // console.log(allBranches);
        let districtCount = 0;

        // Send first message only once to techworks team head
        for (let key in techworksTeamHeadNum) {
            let techworksTeamHeadDistrictMsgRes = await districtMsg("district_common", "DIGI-QUAD", `+91${techworksTeamHeadNum[key]}`, Object.keys(allBranches)[0], allBranches[Object.keys(allBranches)[0]].total, allBranches[Object.keys(allBranches)[0]].active, allBranches[Object.keys(allBranches)[0]].inactive);
            console.log("District --->", districtCount, techworksTeamHeadDistrictMsgRes, "\n");
            ++digiQuadTotalCount;
            await delay(500);
        }


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

                    if (isMessageSent) {
                        let districtMsgRes = await districtMsg("district_common", "DIGI-QUAD", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
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
        }

        console.log('*************************** District Messages Done ************************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", digiQuadTotalCount);
        if (isMessageSent) {
            await delay(2000);
        }



        ////////-------------------------------- Send AM & Assistant Message ----------------------------/////////
        // console.log(JSON.stringify(AEDevice, null, 2));
        const AEDeviceEntries = Object.entries(AEDevice);

        for (let i = 0; i < AEDeviceEntries.length; i++) {
            const [aeName, aeData] = AEDeviceEntries[i];

            // ========== AM Message ========== //
            if (isNaValueFoundHelper(aeData.AM?.['Name']) && aeData.AM?.['Mobile No']) {
                const amNumbers = numbersHelper(aeData.AM['Mobile No']);
                
                for (const amNum of amNumbers) {
                    const messageBodyAM = `DIGI-QUAD STATUS\nAE Name: ${aeName}\nTotal Devices: ${aeData['Total Count']}\nActive Devices: ${aeData['Active Count']}\nInactive Devices: ${aeData['InActive Count']}`;

                    // console.log(`AM Name : ${aeData.AM['Name']} , Mobile : ${amNum}`);
                    // console.log(messageBodyAM, "\n");

                    const obj = {
                        phoneNum: `+91${amNum}`,
                        sentName: aeName,
                        total: aeData['Total Count'],
                        active: aeData['Active Count'],
                        inActive: aeData['InActive Count']
                    };

                    if (isMessageSent) {
                        let amMsgRes = await am_assistant_msg("am_assistant_common", "DIGI-QUAD", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                        console.log(i, "AM --->", amMsgRes);
                        ++digiQuadTotalCount;
                        await delay(500);
                    }
                }
            }

            // ========== Assistant Messages ========== //
            const assistants = aeData.Assistants || {};
            for (const [assistantName, assistantData] of Object.entries(assistants)) {
                if (isNaValueFoundHelper(assistantName) && assistantData?.['Mobile No']) {
                    const assistantNumbers = numbersHelper(assistantData['Mobile No']);
                    
                    for (const assistantNum of assistantNumbers) {
                        const messageBodyAssistant = `DIGI-QUAD STATUS\nAE Name: ${aeName}\nAssistant: ${assistantName}\nTotal Devices: ${assistantData.Total}\nActive Devices: ${assistantData.Active}\nInactive Devices: ${assistantData.Inactive}`;

                        // console.log(`Assistant Name : ${assistantName} , Mobile : ${assistantNum}`);
                        // console.log(messageBodyAssistant, "\n");

                        const obj = {
                            phoneNum: `+91${assistantNum}`,
                            sentName: aeName,
                            total: assistantData.Total,
                            active: assistantData.Active,
                            inActive: assistantData.Inactive
                        };

                        if (isMessageSent) {
                            let assistantMsgRes = await am_assistant_msg("am_assistant_common", "DIGI-QUAD", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                            console.log(i, "Assistant --->", assistantMsgRes);
                            ++digiQuadTotalCount;
                            await delay(500);
                        }
                    }
                }
            }
        }

        console.log('************************ AM & Assistant Messages Done ***********************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", digiQuadTotalCount);
        if (isMessageSent) {
            await delay(2000);
        }



        ////////-------------------------------- Send AE and TL Message ----------------------------/////////
        // console.log(TLDevice)
        for (let i = 0; i < TLDevice.length; i++) {
            const x = TLDevice[i];
            // console.log("Branch :: ", x['Branch']);

            // Ae Logic
            if (isNaValueFoundHelper(x['AE Name']) && x['AE Mobile No']) {
                const aeNumbers = numbersHelper(x['AE Mobile No']);
                const tlNumbers = numbersHelper(x['TL Mobile No']);
                const firstTlNum = tlNumbers.length > 0 ? tlNumbers[0] : (numberHelper(x['TL Mobile No']) !== 'NA' ? numberHelper(x['TL Mobile No']) : 'NA');
                
                for (const aeNum of aeNumbers) {
                    let messageBodyAE = `Hi ! DIGI-QUAD is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${firstTlNum}\nStore Number: ${x['Store Number']}`;
                    // console.log(`${aeNum}`, "\n")
                    // console.log(messageBodyAE)

                    let obj = {
                        "phoneNum": `+91${aeNum}`,
                        "storeName": x['Store Name'],
                        "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                        "tlName": x['TL Name'],
                        "tlNum": firstTlNum,
                        "storeNum": x['Store Number'],
                        "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['AE Name'])}&number=${aeNum}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=digiQuad`
                    }

                    if (isMessageSent) {
                        let aeMsgRes = await ae_msg_digi_quad("ae_template_for_digi_quad", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                        console.log(i, "AE --->", aeMsgRes);
                        ++digiQuadTotalCount;
                        await delay(500);
                    }
                }
            }

            // Ae 2 Logic
            if (isNaValueFoundHelper(x['AE 2 Name']) && x['AE 2 Mobile No']) {
                const ae2Numbers = numbersHelper(x['AE 2 Mobile No']);
                const tlNumbers = numbersHelper(x['TL Mobile No']);
                const firstTlNum = tlNumbers.length > 0 ? tlNumbers[0] : (numberHelper(x['TL Mobile No']) !== 'NA' ? numberHelper(x['TL Mobile No']) : 'NA');
                
                for (const ae2Num of ae2Numbers) {
                    let messageBodyAE2 = `Hi ! DIGI-QUAD is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${firstTlNum}\nStore Number: ${x['Store Number']}`;
                    // console.log(`${ae2Num}`, "\n")
                    // console.log(messageBodyAE2)

                    let obj = {
                        "phoneNum": `+91${ae2Num}`,
                        "storeName": x['Store Name'],
                        "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                        "tlName": x['TL Name'],
                        "tlNum": firstTlNum,
                        "storeNum": x['Store Number'],
                        "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['AE 2 Name'])}&number=${ae2Num}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=digiQuad`
                    }

                    if (isMessageSent) {
                        let ae2MsgRes = await ae_msg_digi_quad("ae_template_for_digi_quad", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                        console.log(i, "AE --->", ae2MsgRes);
                        ++digiQuadTotalCount;
                        await delay(500);
                    }
                }
            }

            // Tl Logic
            if (isNaValueFoundHelper(x['TL Name']) && x['TL Mobile No']) {
                const tlNumbers = numbersHelper(x['TL Mobile No']);
                
                for (const tlNum of tlNumbers) {
                    let messageBodyTL = `Hi ! DIGI-QUAD is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nStore Number: ${x['Store Number']}`;
                    // console.log(`${tlNum}`, "\n")
                    // console.log(messageBodyTL)

                    let obj = {
                        "phoneNum": `+91${tlNum}`,
                        "storeName": x['Store Name'],
                        "deviceId": x['Device ID'],
                        "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                        "storeNum": x['Store Number'],
                        "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['TL Name'])}&number=${tlNum}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=digiQuad`
                    }

                    if (isMessageSent) {
                        let tlMsgRes = await tl_msg_digi_quad("tl_template_for_digi_quad", null, obj.phoneNum, obj.storeName, obj.deviceId, obj.dhanushId, obj.storeNum, obj.buttonUrl);
                        console.log(i, "TL --->", tlMsgRes);
                        ++digiQuadTotalCount;
                        await delay(500);
                    }
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
