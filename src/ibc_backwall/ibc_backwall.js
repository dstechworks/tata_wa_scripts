const { nationalMsg, deviceWiseBackwallStatusMsg, districtMsg, am_assistant_msg, ae_msg, tl_msg } = require('../utils/whatsappMsgTempUtils.js');
const { delay, nameHelper, numberHelper, areAllZonesZero, naValueHelper, isNaValueFoundHelper, spaceCheckerHelper } = require('../utils/helpers.js');
const { saveDataToExcel } = require('../utils/saveExcelUtils.js');
const { google } = require('googleapis');
const path = require('path');

// Logger Intialize
const logger = require('./ibc_backwall_logger');

const baseSpreadsheetId = "1aV_JKLR0nPj1HUaVxKr5TVl8OB-9MzR6NV-TfhYaBoQ";
const ibcCubesSpreadsheetId = "1cJ4taK4D7DClu6XBpVQeZFcsE4gvh9PkJkLP_J8QRkU";
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
                if (reference == "CubesSheetCall") {
                    const folderPath = path.join(__dirname, 'ibc-backwall-daily-files');
                    let saveDataToExcelRes = await saveDataToExcel(result, folderPath);
                }
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
    let getCubesSheetData = await getDataFromGoogleSheets(ibcCubesSpreadsheetId, 'CubesSheetCall');
    let baseDataSheet = workbookData["Backwall"];
    let reportDataSheet = workbookData["ibc"];


    if (getBaseSheetData && getCubesSheetData && baseDataSheet.length > 0 && reportDataSheet.length > 0) {
        console.log(`BASE DATA FILE LENGTH :: ${baseDataSheet.length}`);
        console.log(`CUBES DATA LENGTH :: ${reportDataSheet.length}`);
        console.log("\n");

        function findMismatchedDevices(array1, array2) {
            const map2 = new Map(array2.map(obj => [obj['Device ID'], obj]));
            return array1.filter(obj => !map2.has(obj['Device ID']));
        }

        function getInactiveDevices() {
            let temp = []

            reportDataSheet.forEach(x => {
                let filterData = baseDataSheet.find(y => y['Device ID'] == x['Device ID']);

                if (filterData) {
                    if (filterData['Device ID'] && x['Status'] == 'ACTIVE' && x['Active?'] == 0) {
                        x['Dhanush Id'] = naValueHelper(filterData['Dhanush Id']);
                        x['Device ID'] = filterData['Device ID'];
                        x['Store Name'] = nameHelper(filterData['Store Name']);
                        x['Store Number'] = numberHelper(x['Phone Number']);
                        x['Branch'] = naValueHelper(filterData['Branch']);
                        x['TL Name'] = nameHelper(filterData['TL Name']);
                        x['TL Mobile No'] = numberHelper(filterData['TL Mobile No']);
                        x['AE Name'] = nameHelper(filterData['AE Name']);
                        x['AE Mobile No'] = numberHelper(filterData['AE Mobile No']);
                        x['AE 2 Name'] = nameHelper(filterData['AE 2 Name']);
                        x['AE 2 Mobile No'] = numberHelper(filterData['AE 2 Mobile No']);

                        temp.push(x)
                    }
                }
            })

            temp.sort((a, b) => {
                if (a.Branch === "SBLR") {
                    return -1; // "SBLR" comes first
                } else if (b.Branch === "SBLR") {
                    return 1; // "SBLR" comes after
                } else {
                    return 0; // no change in order for other branches
                }
            });

            return temp
        }

        function mergeAllData() {
            let temp = []
            baseDataSheet.forEach(x => {
                reportDataSheet.forEach(y => {
                    if (x['Device ID'] == y['Device ID']) x['report'] = y;
                })
                temp.push(x)
            })
            return temp;
        }

        function getAllBranch() {
            let temp = {}
            baseDataSheet.forEach(x => {
                temp[x['Branch']] = {}
            })
            return temp
        }

        let backwallTotalCount = 0;
        let AEDevice = {}
        let NationalPOCNum = {
            "Hitesh": "8700685675",
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
        let IBC_KOLKATA_POC_NUMBER = {
            "Hitesh": "8700685675",
            "Dhruv": "8826909378",
            "Sumit": "8920131195",
            "Pratek": "9818429501",
            "Chirag": "9818875211",
            "rusum": "9266903108",
            "Mark": "7871419732",
            "Rohan": "9888311338",
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
        let totalDevices = 0;
        let allBranches = getAllBranch()

        mergeAllData().forEach(x => {
            if (x.report != undefined) {
                if (x.report['Status'] == 'ACTIVE') {
                    totalDevices++;
                    allBranches[x['Branch']].active = 0
                    allBranches[x['Branch']].inactive = 0
                    allBranches[x['Branch']].total = 0
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
        })

        mergeAllData().forEach(x => {
            if (x.report != undefined) {
                if (x.report['Status'] == 'ACTIVE') {
                    allBranches[x['Branch']].total++
                    AEDevice[x['AE Name']]['Total Count']++
                    if (x.report['Active?'] == 0) {
                        allBranches[x['Branch']].inactive++
                        AEDevice[x['AE Name']]['InActive Count']++
                    }
                    if (x.report['Active?'] == 1) {
                        allBranches[x['Branch']].active++
                        AEDevice[x['AE Name']]['Active Count']++
                    }
                }
            }
        })

        for (const property in allBranches) {
            if (allBranches[property].active != undefined || allBranches[property].inactive != undefined) {
                zone[property.substring(0, 1)].active += parseInt(allBranches[property].active)
                zone[property.substring(0, 1)].inactive += parseInt(allBranches[property].inactive)
            }
        }




        /////////------------------------------- Send National Message ----------------------------/////////
        let messageBodyNP = `NATIONAL IBC-BACKWALL STATUS
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
            await delay(10000);
        }

        for (let key in NationalPOCNum) {
            let phoneNum = `+91${NationalPOCNum[key]}`;
            // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);
            if (isMessageSent) {
                let nationalMsgRes = await nationalMsg("national_common", "IBC-BACKWALL", phoneNum, zone);
                console.log(`${key} ---> ${nationalMsgRes}`);
                ++backwallTotalCount;
                await delay(500);
            }
        }

        console.log("\n");
        console.log('*************************** National Messages Done ************************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", backwallTotalCount);
        if (isMessageSent) {
            await delay(1000);
        }




        /////////------------------------------- Send itc kolkata ibc backwall Message ----------------------------/////////
        let findByDeviceId = reportDataSheet.filter(x => x['Device ID'] == 'BI2765')[0];
        let statusOfDevice = findByDeviceId['Active?'] == 0 ? 'OFFLINE' : 'ONLINE';
        let itcKolkataOfficeDevice = `BACKWALL STATUS\n\nDevice Id = ${findByDeviceId['Device ID']} \nStatus = ${statusOfDevice}`;
        // console.log(itcKolkataOfficeDevice, "\n");
        for (let key in IBC_KOLKATA_POC_NUMBER) {
            let phoneNum = `+91${IBC_KOLKATA_POC_NUMBER[key]}`;
            // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);

            if (isMessageSent) {
                let deviceWiseBackwallMsgRes = await deviceWiseBackwallStatusMsg("device_wise_backwall_status", null, phoneNum, findByDeviceId, statusOfDevice);
                console.log(`Itc Kolkata Ibc Backwall ---> ${key} ---> ${deviceWiseBackwallMsgRes}`);
                ++backwallTotalCount;
                await delay(500);
            }
        }

        console.log("\n");
        console.log('*************************** IBC Kolkata device Messages Done ************************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", backwallTotalCount);
        if (isMessageSent) {
            await delay(1000);
        }



        ////////-------------------------------- Send District Message ----------------------------/////////
        // console.log(allBranches);
        console.log("\n");
        let districtCount = 0;
        for (let key in allBranches) {
            if (allBranches[key]['active']) {
                allBranches[key]["District POC Numbers"] = DistrictPOCNum[`${key[0]}`]
                // console.log(allBranches[key]["District POC Numbers"]);
                for (let pocNum in allBranches[key]["District POC Numbers"]) {
                    districtCount++;
                    let messageBodyDP = `BACKWALL STATUS\nBranch Name: ${key}\nTotal Devices: ${allBranches[key]['total']}\nActive Devices: ${allBranches[key]['active']}\nInactive Devices: ${allBranches[key]['inactive']}`;
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
                        let districtMsgRes = await districtMsg("district_common", "IBC-BACKWALL", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                        console.log("District --->", districtCount, districtMsgRes, "\n");
                        ++backwallTotalCount;
                        await delay(500);

                        // if (districtCount > 0) {
                        //     let districtMsgRes = await districtMsg("district_common", "IBC-BACKWALL", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                        //     console.log("District --->", districtCount, districtMsgRes, "\n");
                        //     ++backwallTotalCount;
                        //     await delay(500);
                        // }
                    }

                }
            }
        }

        console.log('*************************** District Messages Done ************************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", backwallTotalCount);
        if (isMessageSent) {
            await delay(1000);
        }




        ////////-------------------------------- Send AM & Assistant Message ----------------------------/////////
        // console.log(AEDevice)
        const AEDeviceEntries = Object.entries(AEDevice);

        for (let i = 0; i < AEDeviceEntries.length; i++) {
            const [property, data] = AEDeviceEntries[i];

            if (property) {
                // Am Logic
                if (isNaValueFoundHelper(data['AM Name']) && isNaValueFoundHelper(data['AM Mobile No'])) {
                    let messageBodyAM = `BACKWALL STATUS\nAE Name: ${property}\nTotal Devices: ${data['Total Count']}\nActive Devices: ${data['Active Count']}\nInactive Devices: ${data['InActive Count']}`
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
                        let amMsgRes = await am_assistant_msg("am_assistant_common", "IBC-BACKWALL", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                        console.log(i, "AM --->", amMsgRes);
                        ++backwallTotalCount;
                        await delay(500);
                    }
                }

                // Assistant Logic
                if (isNaValueFoundHelper(data['Assistant Name']) && isNaValueFoundHelper(data['Assistant Mobile No'])) {
                    let messageBodyAssistant = `BACKWALL STATUS\nAE Name: ${property}\nTotal Devices: ${data['Total Count']}\nActive Devices: ${data['Active Count']}\nInactive Devices: ${data['InActive Count']}`
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
                        let assistantMsgRes = await am_assistant_msg("am_assistant_common", "IBC-BACKWALL", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                        console.log(i, "Assistant --->", assistantMsgRes);
                        ++backwallTotalCount;
                        await delay(500);
                    }
                }

                // Assistant 2 Logic
                if (isNaValueFoundHelper(data['Assistant 2 Name']) && isNaValueFoundHelper(data['Assistant 2 Mobile No'])) {
                    let messageBodyAssistant = `BACKWALL STATUS\nAE Name: ${property}\nTotal Devices: ${data['Total Count']}\nActive Devices: ${data['Active Count']}\nInactive Devices: ${data['InActive Count']}`
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
                        let assistant2MsgRes = await am_assistant_msg("am_assistant_common", "IBC-BACKWALL", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                        console.log(i, "Assistant 2 --->", assistant2MsgRes);
                        ++backwallTotalCount;
                        await delay(500);
                    }
                }
            }
        }

        console.log("\n");
        console.log('************************ AM & Assistant Messages Done ***********************', "\n");
        console.log("TOTAL MESSAGE COUNT = ", backwallTotalCount);
        if (isMessageSent) {
            await delay(1000);
        }




        ////////-------------------------------- Send AE and TL Message ----------------------------/////////
        // console.log(getInactiveDevices())
        const inactiveDevicesForAeTl = getInactiveDevices();

        for (let i = 0; i < inactiveDevicesForAeTl.length; i++) {
            const x = inactiveDevicesForAeTl[i];
            // console.log("Branch :: ", x['Branch']);

            // Ae Logic
            if (isNaValueFoundHelper(x['AE Name']) && isNaValueFoundHelper(x['AE Mobile No'])) {
                let messageBodyAE = `Hi ! Backwall is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${x['TL Mobile No']}\nStore Number: ${x['Store Number']}`;
                // console.log("\n")
                // console.log(messageBodyAE)

                let obj = {
                    "phoneNum": `+91${x['AE Mobile No']}`,
                    "storeName": x['Store Name'],
                    "dhanushId": 'NA',
                    "tlName": x['TL Name'],
                    "tlNum": x['TL Mobile No'],
                    "storeNum": x['Store Number'],
                    "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['AE Name'])}&number=${x['AE Mobile No']}&dhanushid=NA&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=ibcBackwall`
                }

                if (isMessageSent) {
                    let aeMsgRes = await ae_msg("ae_template_for_backwall", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                    console.log(i, "AE --->", aeMsgRes);
                    ++backwallTotalCount;
                    await delay(500);
                }
            }

            // Ae 2 Logic
            if (isNaValueFoundHelper(x['AE 2 Name']) && isNaValueFoundHelper(x['AE 2 Mobile No'])) {
                let messageBodyAE2 = `Hi ! Backwall is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${x['TL Mobile No']}\nStore Number: ${x['Store Number']}`;
                // console.log("\n")
                // console.log(messageBodyAE2)

                let obj = {
                    "phoneNum": `+91${x['AE 2 Mobile No']}`,
                    "storeName": x['Store Name'],
                    "dhanushId": 'NA',
                    "tlName": x['TL Name'],
                    "tlNum": x['TL Mobile No'],
                    "storeNum": x['Store Number'],
                    "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['AE 2 Name'])}&number=${x['AE 2 Mobile No']}&dhanushid=NA&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=ibcBackwall`
                }

                if (isMessageSent) {
                    let ae2MsgRes = await ae_msg("ae_template_for_backwall", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                    console.log(i, "AE 2 --->", ae2MsgRes);
                    ++backwallTotalCount;
                    await delay(500);
                }
            }

            // Tl Logic
            if (isNaValueFoundHelper(x['TL Name']) && isNaValueFoundHelper(x['TL Mobile No'])) {
                let messageBodyTL = `Hi ! Backwall is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nStore Number: ${x['Store Number']}`;
                // console.log("\n")
                // console.log(messageBodyTL)

                let obj = {
                    "phoneNum": `+91${x['TL Mobile No']}`,
                    "storeName": x['Store Name'],
                    "dhanushId": 'NA',
                    "storeNum": x['Store Number'],
                    "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['TL Name'])}&number=${x['TL Mobile No']}&dhanushid=NA&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=ibcBackwall`
                }

                if (isMessageSent) {
                    let tlMsgRes = await tl_msg("team_lead_backwall", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.storeNum, obj.buttonUrl);
                    console.log(i, "TL --->", tlMsgRes);
                    ++backwallTotalCount;
                    await delay(500);
                }
            }
        }

        console.log("\n");
        console.log('*************************** AE and TL Messages Done ************************', "\n");
        console.log("-------------------------- All Messages Sent Successful --------------------");
        console.log("TOTAL MESSAGE COUNT = ", backwallTotalCount);
    }
}

sendMessage();