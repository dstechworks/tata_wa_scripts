const { nationalMsg, districtMsg, am_assistant_msg, ae_msg_squad_360, tl_msg_squad_360 } = require('../utils/whatsappMsgTempUtils');
const { delay, areAllZonesZero, nameHelper, numberHelper, conditionCheckerHelper, naValueHelper, isNaValueFoundHelper, spaceCheckerHelper } = require('../utils/helpers');
const { saveDataToExcel } = require('../utils/saveExcelUtils');
const moment = require('moment-timezone');
const axios = require('axios');
const path = require('path');

// Logger Intialize
const logger = require('./squad_360_logger');

let isMessageSent = true;
let listOfAssistant = [
    { "Branch": "NDEL", "Assistant Name": "Kunal Tiberwal", "Assistant Mobile No": "8017970345" }
];

// Function to get access token
async function getAccessToken() {
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

    try {
        const response = await axios.request(config);
        return response.data.accessToken;
    } catch (error) {
        console.error('Error getting access token:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}

// Function to get all screens
async function getAllScreens(token) {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://monitor-api.squad360.in/api/v1/screens',
        headers: {
            'authorization': `Bearer ${token}`
        }
    };

    try {
        const response = await axios.request(config);
        // console.log('Screens data retrieved successfully');
        return response.data;
    } catch (error) {
        console.error('Error getting screens:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}

// Function to get all screens status
async function getAllScreensStatus(token) {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://monitor-api.squad360.in/api/v1/screens/offline-by-branch',
        headers: {
            'authorization': `Bearer ${token}`
        }
    };

    try {
        const response = await axios.request(config);
        const allScreens = response?.data?.data?.branchStats?.flatMap(branch => branch.screens || []);
        return allScreens;
    } catch (error) {
        console.error('Error getting screens status:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}

// Function to filter screens by displayStatus and screenType and extract specific fields
function filterAndFormatScreens(screens, screensStatus, displayStatus, screenType) {
    const filteredScreens = screens.filter(screen =>
        screen.displayStatus == displayStatus &&
        screen.screenType == screenType
    );

    // Create a map of screenId to status for quick lookup
    const statusMap = {};
    if (Array.isArray(screensStatus)) {
        screensStatus.forEach(statusItem => {
            if (statusItem && statusItem.screenId) {
                // Convert boolean status to 'Active'/'InActive' string
                statusMap[statusItem.screenId] = statusItem.status == 'online' ? 'Active' : 'InActive';
            }
        });
    }

    return filteredScreens.map(screen => {
        // Extract only the desired fields in the specified order
        return {
            screenId: screen.screenId,
            displayStatus: screen.displayStatus,
            isActive: statusMap[screen.screenId] || 'InActive', // Set as 'Active'/'InActive' instead of true/false
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
}

const renameAllKeyNames = async (data) => {
    return data.map(filterData => {
        const x = {};

        x['Device ID'] = filterData.screenId?.trim();
        x['Dhanush Id'] = naValueHelper(filterData.dhanushId);
        x['Store Name'] = nameHelper(filterData.name);
        x['Store Number'] = numberHelper(filterData.ownerContactNumber);
        x['Branch'] = naValueHelper(filterData.branch?.trim());
        x['Catg.'] = "backwall";
        x['WD Code'] = naValueHelper(filterData.wdCode);
        x['WD Name'] = naValueHelper(filterData.wdName);
        x['Status'] = filterData.isActive; // Add the status field with 'Active'/'InActive' value
        x['TL Name'] = nameHelper(filterData.teamLeadName);
        x['TL Mobile No'] = numberHelper(filterData.teamLeadContactNumber);
        x['AE Name'] = nameHelper(filterData.areaExecutiveName);
        x['AE Mobile No'] = numberHelper(filterData.areaExecutiveContactNumber);
        x['AM Name'] = nameHelper(filterData.areaManagerName);
        x['AM Mobile No'] = numberHelper(filterData.areaManagerContactNumber);

        // Find matching assistant from listOfAssistant
        const branch = naValueHelper(filterData.branch?.trim());
        const assistant = listOfAssistant.find(a => a.Branch === branch);

        x['Assistant Name'] = assistant ? nameHelper(assistant['Assistant Name']) : "";
        x['Assistant Mobile No'] = assistant ? numberHelper(assistant['Assistant Mobile No']) : "";

        return x;
    });
};

const startMessages = async (data) => {
    function getAllBranch() {
        let temp = {}
        data.forEach(x => {
            temp[x['Branch']] = {}
        })
        return temp
    }

    let squad360TotalCount = 0;
    let AEDevice = {};
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
    let allBranches = getAllBranch();

    data.forEach(x => {
        const aeName = nameHelper(x['AE Name']);
        const assistant1 = nameHelper(x['Assistant Name']);
        const assistant1Mobile = numberHelper(x['Assistant Mobile No']);
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
                'Store Name': nameHelper(x['Store Name']),
                'Store Number': numberHelper(x['Store Number']),
                'Branch': naValueHelper(x['Branch']),
                'TL Name': nameHelper(x['TL Name']),
                'TL Mobile No': numberHelper(x['TL Mobile No']),
                'AE Name': nameHelper(x['AE Name']),
                'AE Mobile No': numberHelper(x['AE Mobile No'])
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
                    'Mobile No': numberHelper(x['AM Mobile No'])
                },
                'Assistants': {}
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
    let messageBodyNP = `NATIONAL SQUAD-360 STATUS
North : ${zone.N.active} (Active) / ${zone.N.inactive} (Inactive)
South : ${zone.S.active} (Active) / ${zone.S.inactive} (Inactive)
East  : ${zone.E.active} (Active) / ${zone.E.inactive} (Inactive)
West  : ${zone.W.active} (Active) / ${zone.W.inactive} (Inactive)`;
    console.log("\n");
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
    //         let nationalMsgRes = await nationalMsg("national_common", "SQUAD-360", phoneNum, zone);
    //         console.log(`${key} ---> ${nationalMsgRes}`);
    //         ++squad360TotalCount;
    //         await delay(500);
    //     }
    // }

    // console.log("\n");
    // console.log('*************************** National Messages Done ************************', "\n");
    // console.log("TOTAL MESSAGE COUNT = ", squad360TotalCount);
    // if (isMessageSent) {
    //     await delay(1000);
    // }

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
                let messageBodyDP = `SQUAD-360 STATUS\nBranch Name: ${key}\nTotal Devices: ${allBranches[key]['total']}\nActive Devices: ${allBranches[key]['active']}\nInactive Devices: ${allBranches[key]['inactive']}`;
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
                    let districtMsgRes = await districtMsg("district_common", "SQUAD-360", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                    console.log("District --->", districtCount, districtMsgRes, "\n");
                    ++squad360TotalCount;
                    await delay(500);


                    // if (districtCount > 0) {
                    //     let districtMsgRes = await districtMsg("district_common", "SQUAD-360", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                    //     console.log("District --->", districtCount, districtMsgRes, "\n");
                    //     ++squad360TotalCount;
                    //     await delay(500);
                    // }

                    // Send first message only once to Hitesh (per branch)
                    if (districtCount == 1 && allBranches[key]["District POC Numbers"]["Hitesh"]) {
                        let districtMsgRes = await districtMsg("district_common", "SQUAD-360", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
                        console.log("District --->", districtCount, districtMsgRes, "\n");
                        ++squad360TotalCount;
                        await delay(500);
                    }
                }
            }
        }
    }

    console.log('*************************** District Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", squad360TotalCount);
    if (isMessageSent) {
        await delay(1000);
    }

    ////////-------------------------------- Send AM & Assistant Message ----------------------------/////////
    // console.log(JSON.stringify(AEDevice, null, 2));
    const AEDeviceEntries = Object.entries(AEDevice);

    for (let i = 0; i < AEDeviceEntries.length; i++) {
        const [aeName, aeData] = AEDeviceEntries[i];

        // ========== AM Message ========== //
        if (isNaValueFoundHelper(aeData.AM?.['Name']) && isNaValueFoundHelper(aeData.AM?.['Mobile No'])) {
            const messageBodyAM = `SQUAD-360 STATUS\nAE Name: ${aeName}\nTotal Devices: ${aeData['Total Count']}\nActive Devices: ${aeData['Active Count']}\nInactive Devices: ${aeData['InActive Count']}`;

            // console.log(`AM Name : ${aeData.AM['Name']} , Mobile : ${aeData.AM['Mobile No']}`);
            // console.log(messageBodyAM, "\n");

            const obj = {
                phoneNum: `+91${aeData.AM['Mobile No']}`,
                sentName: aeName,
                total: aeData['Total Count'],
                active: aeData['Active Count'],
                inActive: aeData['InActive Count']
            };

            if (isMessageSent) {
                let amMsgRes = await am_assistant_msg("am_assistant_common", "SQUAD-360", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                console.log(i, "AM --->", amMsgRes);
                ++squad360TotalCount;
                await delay(500);
            }
        }

        // ========== Assistant Messages ========== //
        const assistants = aeData.Assistants || {};
        for (const [assistantName, assistantData] of Object.entries(assistants)) {
            if (isNaValueFoundHelper(assistantName) && isNaValueFoundHelper(assistantData?.['Mobile No'])) {
                const messageBodyAssistant = `SQUAD-360 STATUS\nAE Name: ${aeName}\nAssistant: ${assistantName}\nTotal Devices: ${assistantData.Total}\nActive Devices: ${assistantData.Active}\nInactive Devices: ${assistantData.Inactive}`;

                // console.log(`Assistant Name : ${assistantName} , Mobile : ${assistantData['Mobile No']}`);
                // console.log(messageBodyAssistant, "\n");

                const obj = {
                    phoneNum: `+91${assistantData['Mobile No']}`,
                    sentName: aeName,
                    total: assistantData.Total,
                    active: assistantData.Active,
                    inActive: assistantData.Inactive
                };

                if (isMessageSent) {
                    let assistantMsgRes = await am_assistant_msg("am_assistant_common", "SQUAD-360", obj.phoneNum, obj.sentName, obj.total, obj.active, obj.inActive);
                    console.log(i, "Assistant --->", assistantMsgRes);
                    ++squad360TotalCount;
                    await delay(500);
                }
            }
        }
    }

    console.log('************************ AM & Assistant Messages Done ***********************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", squad360TotalCount);
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
            let messageBodyAE = `Hi ! SQUAD-360 is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nTL Number: ${x['TL Mobile No']}\nStore Number: ${x['Store Number']}`;
            // console.log(`${x['AE Mobile No']}`, "\n")
            // console.log(messageBodyAE)

            let obj = {
                "phoneNum": `+91${x['AE Mobile No']}`,
                "storeName": x['Store Name'],
                "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                "tlName": x['TL Name'],
                "tlNum": x['TL Mobile No'],
                "storeNum": x['Store Number'],
                "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['AE Name'])}&number=${x['AE Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=squad360`
            }

            if (isMessageSent) {
                let aeMsgRes = await ae_msg_squad_360("ae_temp_squad_360", null, obj.phoneNum, obj.storeName, obj.dhanushId, obj.tlName, obj.tlNum, obj.storeNum, obj.buttonUrl);
                console.log(i, "AE --->", aeMsgRes);
                ++squad360TotalCount;
                await delay(500);
            }
        }

        // Tl Logic
        if (isNaValueFoundHelper(x['TL Name']) && isNaValueFoundHelper(x['TL Mobile No'])) {
            let messageBodyTL = `Hi ! SQUAD-360 is not working at the following store\nStore Name: ${x['Store Name']}\nDhanush ID: ${x['Dhanush Id']}\nStore Number: ${x['Store Number']}`;
            // console.log(`${x['TL Mobile No']}`, "\n")
            // console.log(messageBodyTL)

            let obj = {
                "phoneNum": `+91${x['TL Mobile No']}`,
                "storeName": x['Store Name'],
                "deviceId": x['Device ID'],
                "dhanushId": x['Dhanush Id'] ? x['Dhanush Id'] : 'NA',
                "storeNum": x['Store Number'],
                "buttonUrl": `complaint.html?storename=${spaceCheckerHelper(x['Store Name'])}&name=${spaceCheckerHelper(x['TL Name'])}&number=${x['TL Mobile No']}&dhanushid=${x['Dhanush Id']}&branch=${x['Branch']}&deviceid=${x['Device ID']}&type=squad360`
            }

            if (isMessageSent) {
                let tlMsgRes = await tl_msg_squad_360("tl_temp_squad_360", null, obj.phoneNum, obj.storeName, obj.deviceId, obj.dhanushId, obj.storeNum, obj.buttonUrl);
                console.log(i, "TL --->", tlMsgRes);
                ++squad360TotalCount;
                await delay(500);
            }
        }
    }

    console.log('*************************** AE and TL Messages Done ************************', "\n");
    console.log("-------------------------- All Messages Sent Successful --------------------");
    console.log("TOTAL MESSAGE COUNT = ", squad360TotalCount);

    console.log("\n=====================================================================");
    console.log(`SCRIPT FINISHED AT: ${moment().tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm A")}`);
    console.log("=====================================================================");
}

// Main function to execute the API calls
async function main() {
    try {
        // Get access token
        const token = await getAccessToken();
        console.log('Access token:', token);

        // Get all screens using the token
        const allScreensData = await getAllScreens(token);
        console.log("\n");
        console.log('Total screens count:', allScreensData.length);

        // Get all screens status
        const allScreensStatus = await getAllScreensStatus(token);
        // console.log('Screens status data retrieved');

        // Filter screens with displayStatus="Active" and screenType="backwall" and format data
        const formattedScreens = filterAndFormatScreens(allScreensData, allScreensStatus, "Active", "backwall");
        console.log('Filtered screens count:', formattedScreens.length);

        // Save the renamed data to Excel
        const folderPath = path.join(__dirname, 'squad-360-daily-files');
        await saveDataToExcel(formattedScreens, folderPath);

        // Rename keys for the formatted data
        const renamedData = await renameAllKeyNames(formattedScreens);
        console.log('Renamed Data Successfully');

        await startMessages(renamedData);
    } catch (error) {
        console.error('Error in main function:', error.message);
    }
}

// Execute the main function
main();
