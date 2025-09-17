const { nationalMsg, districtMsg, am_assistant_msg, ae_msg, tl_msg } = require('../utils/whatsappMsgTempUtils');
const { delay, nameHelper, numberHelper, areAllZonesZero, conditionCheckerHelper, naValueHelper, spaceCheckerHelper, isNaValueFoundHelper } = require('../utils/helpers.js');
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
const logger = require('./techworks_tab_logger');

const baseSpreadsheetId = "1aV_JKLR0nPj1HUaVxKr5TVl8OB-9MzR6NV-TfhYaBoQ";
let workbookData = {};
let isMessageSent = true;

async function getDataFromGoogleSheets(sheetID, reference) {
    const accessGoogleSheet = async () => {
        try {
            // Initialize the authentication client
            const auth = new google.auth.GoogleAuth({
                keyFile: path.resolve(__dirname, '../../credentials.json'),
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });

            // Get the authenticated client
            const authClientObject = await auth.getClient();

            // Create the Sheets instance
            const sheets = google.sheets({ version: 'v4', auth: authClientObject });

            return sheets; // Return the sheets instance
        } catch (error) {
            console.error("Error initializing Google Sheets API:", error);
            throw error;
        }
    };

    const getAllWorkbookNames = async (sheets) => {
        try {
            // Get workbook names present in the spreadsheet
            const response = await sheets.spreadsheets.get({
                spreadsheetId: sheetID,
            });

            const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
            // console.log('\n');
            // console.log('Sheet Names:', sheetNames);

            return sheetNames; // Return the sheet names
        } catch (error) {
            console.error("Error fetching workbook names:", error);
            throw error;
        }
    };

    const getWorkbookWiseData = async (sheets, sheetNames) => {
        try {
            for (let i = 0; i < sheetNames.length; i++) {
                const sheetName = sheetNames[i];
                // Fetch data for each sheet
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: sheetID,
                    range: sheetName,
                });

                const data = response.data.values || [];
                // console.log(`Data for ${sheetName}:`, data.length);

                // Change array of array data to array of objects like API response
                const [headers, ...rows] = data;
                const result = rows.map(row => Object.fromEntries(headers.map((key, index) => [key, row[index]])));

                workbookData[sheetName] = result;
            }
        } catch (error) {
            console.error("Error fetching data for sheets:", error);
            throw error;
        }

        return true;
    };

    try {
        let sheets = await accessGoogleSheet();
        let sheetNames = await getAllWorkbookNames(sheets);
        let getWorkbookRes = await getWorkbookWiseData(sheets, sheetNames);
        return getWorkbookRes;
    } catch (error) {
        console.error("Error during Google Sheets data retrieval:", error);
    }
}

async function sendMessage() {
    let getBaseSheetData = await getDataFromGoogleSheets(baseSpreadsheetId, 'BaseSheetCall');
    let baseDataSheet = workbookData["Tab"];
    const response = await pool.query(`select * from tab_device_records where branch is not null and branch != 'null' and deploy_status = 'Yes'`);
    let tabTableData = response.rows;

    if (baseDataSheet.length > 0 && tabTableData.length > 0) {
        console.log(`BASE DATA FILE LENGTH :: ${baseDataSheet.length}`);
        console.log(`TAB DEVICE RECORDS LENGTH :: ${tabTableData.length}`);
        console.log("\n");


        function findDevices(args) {
            let dataArr = [];
            tabTableData.forEach(x => {
                let filterData = baseDataSheet.find(y => y['Device ID'] == x['device_id']);
                if (filterData) {
                    x['Dhanush Id'] = naValueHelper(filterData['Dhanush Id']);
                    x['Device ID'] = filterData['Device ID'];
                    x['Store Name'] = naValueHelper(filterData['Store Name']);
                    x['Branch'] = naValueHelper(filterData['Branch']);
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
            const currentDate = new Date(new Date().getTime() - 60 * 60 * 1000);
            findDevices('getMatchedDevices').forEach(x => {
                if (x?.updated_timestamp && x?.branch != null) {
                    if (new Date(x.updated_timestamp) > currentDate) {
                        x['Status'] = 'Active';
                    }
                    if (new Date(x.updated_timestamp) < currentDate) {
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

        // console.log("\n");
        // console.table({
        //     "Total Number of Devices found in Base Sheet ": baseDataSheet.length,
        //     "Total Number of Devices found in Supabase table ": tabTableData?.length,
        //     "Data Not Matched with Base sheet ": findDevices('getNotMatchedDevices').length,
        //     "Data Matched with Base sheet ": findDevices('getMatchedDevices').length,
        //     "Active Devices ": getDevicesByStatus('Active').length,
        //     "IActive Devices ": getDevicesByStatus('InActive').length
        // })
        // console.log("\n");

        let tabTotalCount = 0;
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
            // "Priyank Maheshwari": "9893585458"
        }
        let DistrictPOCNum = {
            "N": {
                "Hitesh": "8700685675",
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
        let totalDevices = 0;
        let allBranches = getAllBranch()

        mergeAllData().forEach(x => {
            // console.log(x);
            if (x.Status == 'Active') {
                totalDevices++;
                allBranches[x['Branch']].active = 0
                allBranches[x['Branch']].inactive = 0
                allBranches[x['Branch']].total = 0

                if (conditionCheckerHelper(x)) {
                    AEDevice[x['AE Name']] = []
                    AEDevice[x['AE Name']]['Total Count'] = 0
                    AEDevice[x['AE Name']]['Active Count'] = 0
                    AEDevice[x['AE Name']]['InActive Count'] = 0

                    AEDevice[x['AE Name']]['AM Name'] = nameHelper(x['AM Name'])
                    AEDevice[x['AE Name']]['AM Mobile No'] = numberHelper(x['AM Mobile No'])
                    AEDevice[x['AE Name']]['Assistant Name'] = nameHelper(x['Assistant Name'])
                    AEDevice[x['AE Name']]['Assistant Mobile No'] = numberHelper(x['Assistant Mobile No'])
                    AEDevice[x['AE Name']]['Assistant 2 Name'] = nameHelper(x['Assistant 2 Name'])
                    AEDevice[x['AE Name']]['Assistant 2 Mobile No'] = numberHelper(x['Assistant 2 Mobile No'])

                    AEDevice[x['Total Devices']] = []
                }
            }

            if (x.Status == 'InActive') {
                TLDevice.push({
                    'Dhanush Id': naValueHelper(x['Dhanush Id']),
                    'Device ID': x['Device ID'],
                    'Store Name': naValueHelper(x['Store Name']),
                    'Store Number': naValueHelper(x['so_contact']),
                    'Branch': naValueHelper(x['Branch']),
                    'TL Name': nameHelper(x['TL Name']),
                    'TL Mobile No': numberHelper(x['TL Mobile No']),
                    'AE Name': nameHelper(x['AE Name']),
                    'AE Mobile No': numberHelper(x['AE Mobile No']),
                    'AE 2 Name': nameHelper(x['AE 2 Name']),
                    'AE 2 Mobile No': numberHelper(x['AE 2 Mobile No']),
                })
            }
        })


        mergeAllData().forEach(x => {
            if (AEDevice[x['AE Name']] && x['Branch'] && conditionCheckerHelper(x)) {
                allBranches[x['Branch']].total++
                AEDevice[x['AE Name']]['Total Count']++
                if (x.Status == 'Active') {
                    allBranches[x['Branch']].active++
                    AEDevice[x['AE Name']]['Active Count']++
                }
                if (x.Status == 'InActive') {
                    allBranches[x['Branch']].inactive++
                    AEDevice[x['AE Name']]['InActive Count']++
                }
            }
        })

        TLDevice.sort((a, b) => {
            if (a.Branch === "SBLR") {
                return -1; // "SBLR" comes first
            } else if (b.Branch === "SBLR") {
                return 1; // "SBLR" comes after
            } else {
                return 0; // no change in order for other branches
            }
        });

        for (const property in allBranches) {
            if (allBranches[property].active != undefined || allBranches[property].inactive != undefined) {
                zone[property.substring(0, 1)].active += parseInt(allBranches[property].active)
                zone[property.substring(0, 1)].inactive += parseInt(allBranches[property].inactive)
            }
        }


        // console.log(totalDevices);
        // console.log(AEDevice);
        // console.log(allBranches);
        // console.log(zone);




        /////////------------------------------- Send National Message ----------------------------/////////
        let messageBodyNP = `NATIONAL TABLET STATUS
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
        //         let nationalMsgRes = await nationalMsg("national_common", "TABLET", phoneNum, zone);
        //         console.log(`${key} ---> ${nationalMsgRes}`);
        //         ++tabTotalCount;
        //         await delay(500);
        //     }
        // }

        // console.log("\n");
        // console.log('*************************** National Messages Done ************************', "\n");
        // console.log("TOTAL MESSAGE COUNT = ", tabTotalCount);
        // if (isMessageSent) {
        //     await delay(2000);
        // }




        ////////-------------------------------- Send District Message ----------------------------/////////
        // console.log(allBranches);
        let districtCount = 0;
        for (let key in allBranches) {
            if (allBranches[key]['active']) {
                allBranches[key]["District POC Numbers"] = DistrictPOCNum[`${key[0]}`]
                // console.log(allBranches[key]["District POC Numbers"]);
                for (let pocNum in allBranches[key]["District POC Numbers"]) {
                    districtCount++;
                    let messageBodyDP = `TABLET STATUS\nBranch Name: ${key}\nTotal Devices: ${allBranches[key]['total']}\nActive Devices: ${allBranches[key]['active']}\nInactive Devices: ${allBranches[key]['inactive']}`;
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
                        let districtMsgRes = await districtMsg("district_common", "TABLET", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                        console.log("District --->", districtCount, districtMsgRes, "\n");
                        ++tabTotalCount;
                        await delay(500);

                        // if (districtCount > 0) {
                        //     let districtMsgRes = await districtMsg("district_common", "TABLET", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                        //     console.log("District --->", districtCount, districtMsgRes, "\n");
                        //     ++tabTotalCount;
                        //     await delay(1000);
                        // }

                         // Send first message only once to Hitesh (per branch)
                         if (districtCount == 1 && allBranches[key]["District POC Numbers"]["Hitesh"]) {
                            let districtMsgRes = await districtMsg("district_common", "TABLET", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                            console.log("District --->", districtCount, districtMsgRes, "\n");
                            ++tabTotalCount;
                            await delay(500);
                        }
                    }

                }
            }
        }

        console.log('*************************** District Messages Done ************************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", tabTotalCount);
        if (isMessageSent) {
            await delay(2000);
        }



        ////////-------------------------------- Send AM & Assistant Message ----------------------------/////////
        // console.log(AEDevice)
        const AEDeviceEntries = Object.entries(AEDevice);

        for (let i = 0; i < AEDeviceEntries.length; i++) {
            const [property, data] = AEDeviceEntries[i];

            if (property) {
                // Am Logic
                if (isNaValueFoundHelper(data['AM Name']) && isNaValueFoundHelper(data['AM Mobile No'])) {
                    let messageBodyAM = `TABLET STATUS\nAE Name: ${property}\nTotal Devices: ${data['Total Count']}\nActive Devices: ${data['Active Count']}\nInactive Devices: ${data['InActive Count']}`
                    // console.log(`AM Name : ${data['AM Name']} , Mobile : ${data['AM Mobile No']} \n`);
                    // console.log(messageBodyAM, "\n");

                    let obj = {
                        "phoneNum": `+91${data['AM Mobile No']}`,
                        "sentName": property,
                        "total": data['Total Count'],
                        "active": data['Active Count'],
                        "inActive": data['InActive Count']
                    }

                    if (isMessageSent) {
                        let amMsgRes = await am_assistant_msg("am_assistant_common", "TABLET", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                        console.log(i, "AM --->", amMsgRes);
                        ++tabTotalCount;
                        await delay(500);
                    }
                }

                // Assistant Logic
                if (isNaValueFoundHelper(data['Assistant Name']) && isNaValueFoundHelper(data['Assistant Mobile No'])) {
                    let messageBodyAssistant = `TABLET STATUS\nAE Name: ${property}\nTotal Devices: ${data['Total Count']}\nActive Devices: ${data['Active Count']}\nInactive Devices: ${data['InActive Count']}`
                    // console.log(`Assistant Name : ${data['Assistant Name']} , Mobile : ${data['Assistant Mobile No']} \n`);
                    // console.log(messageBodyAssistant, "\n");

                    let obj = {
                        "phoneNum": `+91${data['Assistant Mobile No']}`,
                        "sentName": property,
                        "total": data['Total Count'],
                        "active": data['Active Count'],
                        "inActive": data['InActive Count']
                    }

                    if (isMessageSent) {
                        let assistantMsgRes = await am_assistant_msg("am_assistant_common", "TABLET", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                        console.log(i, "Assistant --->", assistantMsgRes);
                        ++tabTotalCount;
                        await delay(500);
                    }
                }

                // Assistant 2 Logic
                if (isNaValueFoundHelper(data['Assistant 2 Name']) && isNaValueFoundHelper(data['Assistant 2 Mobile No'])) {
                    let messageBodyAssistant = `TABLET STATUS\nAE Name: ${property}\nTotal Devices: ${data['Total Count']}\nActive Devices: ${data['Active Count']}\nInactive Devices: ${data['InActive Count']}`
                    // console.log(`Assistant 2 Name : ${data['Assistant 2 Name']} , Mobile : ${data['Assistant 2 Mobile No']} \n`);
                    // console.log(messageBodyAssistant, "\n");

                    let obj = {
                        "phoneNum": `+91${data['Assistant 2 Mobile No']}`,
                        "sentName": property,
                        "total": data['Total Count'],
                        "active": data['Active Count'],
                        "inActive": data['InActive Count']
                    }

                    if (isMessageSent) {
                        let assistant2MsgRes = await am_assistant_msg("am_assistant_common", "TABLET", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                        console.log(i, "Assistant 2 --->", assistant2MsgRes);
                        ++tabTotalCount;
                        await delay(500);
                    }
                }
            }
        }

        console.log('************************ AM & Assistant Messages Done ***********************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", tabTotalCount);
        if (isMessageSent) {
            await delay(2000);
        }



        ////////-------------------------------- Send AE and TL Message ----------------------------/////////
        // console.log(TLDevice)
        for (let i = 0; i < TLDevice.length; i++) {
            const x = TLDevice[i];
            // console.log("Branch :: ", x['Branch']);

            // Ae Logic
            if (isNaValueFoundHelper(x['AE Name']) && isNaValueFoundHelper(x['AE Mobile No'])) {
                let messageBodyAE = `Hi ! Tablet is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${x['TL Mobile No']}\nStore Number: ${x['Store Number']}`;
                // console.log(`${x['AE Mobile No']}`, "\n")
                // console.log(messageBodyAE)

                let obj = {
                    "phoneNum": `+91${x['AE Mobile No']}`,
                    "storeName": x['Store Name'],
                    "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                    "tlName": x['TL Name'],
                    "tlNum": x['TL Mobile No'],
                    "storeNum": x['Store Number'],
                    "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['AE Name'])}&number=${x['AE Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=tab`
                }

                if (isMessageSent) {
                    let aeMsgRes = await ae_msg("ae_template_for_tablet", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                    console.log(i, "AE --->", aeMsgRes);
                    ++tabTotalCount;
                    await delay(500);
                }
            }

            // Ae 2 Logic
            if (isNaValueFoundHelper(x['AE 2 Name']) && isNaValueFoundHelper(x['AE 2 Mobile No'])) {
                let messageBodyAE2 = `Hi ! Tablet is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${x['TL Mobile No']}\nStore Number: ${x['Store Number']}`;
                // console.log(`${x['AE Mobile No']}`, "\n")
                // console.log(messageBodyAE2)

                let obj = {
                    "phoneNum": `+91${x['AE 2 Mobile No']}`,
                    "storeName": x['Store Name'],
                    "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                    "tlName": x['TL Name'],
                    "tlNum": x['TL Mobile No'],
                    "storeNum": x['Store Number'],
                    "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['AE 2 Name'])}&number=${x['AE 2 Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=tab`
                }

                if (isMessageSent) {
                    let ae2MsgRes = await ae_msg("ae_template_for_tablet", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                    console.log(i, "AE --->", ae2MsgRes);
                    ++tabTotalCount;
                    await delay(500);
                }
            }

            // Tl Logic
            if (isNaValueFoundHelper(x['TL Name']) && isNaValueFoundHelper(x['TL Mobile No'])) {
                let messageBodyTL = `Hi ! Tablet is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nStore Number: ${x['Store Number']}`;
                // console.log(`${x['TL Mobile No']}`, "\n")
                // console.log(messageBodyTL)

                let obj = {
                    "phoneNum": `+91${x['TL Mobile No']}`,
                    "storeName": x['Store Name'],
                    "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                    "storeNum": x['Store Number'],
                    "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['TL Name'])}&number=${x['TL Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=tab`
                }

                if (isMessageSent) {
                    let tlMsgRes = await tl_msg("team_lead_tab", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.storeNum, obj.buttonUrl);
                    console.log(i, "TL --->", tlMsgRes);
                    ++tabTotalCount;
                    await delay(500);
                }
            }
        }

        console.log('*************************** AE and TL Messages Done ************************', "\n");
        console.log("-------------------------- All Messages Sent Successful --------------------");
        console.log("TOTAL MESSAGE COUNT = ", tabTotalCount);
    }
}

sendMessage();