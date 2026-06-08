const moment = require('moment-timezone');
const axios = require('axios');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
require('dotenv').config();

let baseUrl = process.env.TATA_BASE_URL;
let authToken = process.env.AUTH_TOKEN;

let listOfAssistant = [
    { "Branch": "NDEL", "Assistant Name": "Kunal Tiberwal", "Assistant Mobile No": "8017970345" }
];

function delay(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

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
        url: 'https://monitor-api.squad360.in/api/v1/screens/all',
        headers: {
            'authorization': `Bearer ${token}`
        }
    };

    try {
        const response = await axios.request(config);
        // console.log('Screens status data retrieved successfully');
        return response.data;
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
                statusMap[statusItem.screenId] = statusItem.status ? 'Active' : 'InActive';
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

const saveDataToExcel = async (data) => {
    try {
        const folderPath = path.join(__dirname, 'squad360-daily-files');

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

const renameAllKeyNames = async (data) => {
    return data.map(filterData => {
        const x = {};

        x['Device ID'] = nameHelper(filterData.screenId?.trim());
        x['Dhanush Id'] = nameHelper(filterData.dhanushId);
        x['Store Name'] = nameHelper(filterData.name);
        x['Branch'] = nameHelper(filterData.branch?.trim());
        x['Catg.'] = "backwall";
        x['WD Code'] = nameHelper(filterData.wdCode);
        x['WD Name'] = nameHelper(filterData.wdName);
        x['Status'] = filterData.isActive; // Add the status field with 'Active'/'InActive' value
        x['TL Name'] = nameHelper(filterData.teamLeadName);
        x['TL Mobile No'] = numberHelper(filterData.teamLeadContactNumber);
        x['AE Name'] = nameHelper(filterData.areaExecutiveName);
        x['AE Mobile No'] = numberHelper(filterData.areaExecutiveContactNumber);
        x['AM Name'] = nameHelper(filterData.areaManagerName);
        x['AM Mobile No'] = numberHelper(filterData.areaManagerContactNumber);

        // Find matching assistant from listOfAssistant
        const branch = nameHelper(filterData.branch?.trim());
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
                            { "type": "text", "text": "SQUAD-360" },
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
                            { "type": "text", "text": "SQUAD-360" },
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
                            { "type": "text", "text": "SQUAD-360" },
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
                "name": "ae_template_for_backwall",
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
                            { "type": "text", "text": tlNum }
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

    async function tl_msg(phoneNum, storeName, dhanushId, storeNum, buttonUrl) {
        let variables = JSON.stringify({
            "to": phoneNum,
            "type": "template",
            "source": "external",
            "template": {
                "name": "team_lead_backwall",
                "language": {
                    "code": "en"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            { "type": "text", "text": storeName },
                            { "type": "text", "text": dhanushId },
                            { "type": "text", "text": storeNum },
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

    async function gupshupMessageSend(phoneNum, zone) {
        fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "apikey": "7hlrfbm64ldqmo9buhtoorpa7tfzfnbq", // 🔁 Replace with your actual API key
                "Accept": "application/json"
            },
            body: new URLSearchParams({
                channel: "whatsapp",
                source: "15558100675",                      // 🔁 Your Gupshup source number
                destination: phoneNum,               // 🔁 Recipient number (no +)
                "src.name": "techworksWaba",               // 🔁 Your app name
                template: JSON.stringify({
                    id: "138e9eeb-0e91-4cc6-bab5-885150705c72",   // 🔁 Template ID
                    params: [
                        "SQUAD-360", // {{1}}
                        zone.N.active,        // {{2}} North Active
                        zone.N.inactive,        // {{3}} North inactive
                        zone.S.active,        // {{4}} South Active
                        zone.S.inactive,        // {{5}} South inactive
                        zone.E.active,        // {{6}} East Active
                        zone.E.inactive,        // {{7}} East inactive
                        zone.W.active,        // {{8}} West Active
                        zone.W.inactive         // {{9}} West inactive
                    ]
                })
            })
        })
            .then(response => response.json())
            .then(data => {
                console.log("✅ Message sent:", data);
            })
            .catch(error => {
                console.error("❌ Error sending message:", error);
            });

    }

    let squad360TotalCount = 0;
    let AEDevice = {};
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
            "Malika Arjun Kalika": "8123919411",
            "Sumit Bothra": "9831077603"
        },
        "S": {
            "Mr Sudalai Muthu": "9949496708",
            "Vikas": "7483579458",
            "Baker Fen John": "9994810050",
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
    console.log(zone);

    /////////------------------------------- Send National Message ----------------------------/////////
    let messageBodyNP = `NATIONAL SQUARD-360 STATUS\nWest : ${zone.W.active} (Active) / ${zone.W.inactive} (Inactive)\nNorth : ${zone.N.active} (Active) / ${zone.N.inactive} (Inactive)\nEast : ${zone.E.active} (Active) / ${zone.E.inactive} (Inactive)\nSouth : ${zone.S.active} (Active) / ${zone.S.inactive} (Inactive)`;
    console.log(messageBodyNP, "\n");

    await delay(7000);

    for (let key in NationalPOCNum) {
        let phoneNum = `+91${NationalPOCNum[key]}`;
        // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);

        let nationalMsgRes = await gupshupMessageSend(phoneNum, zone);
        console.log(`${key} ---> ${nationalMsgRes}`);
        ++squad360TotalCount;
        await delay(500);
    }

    console.log("\n");
    console.log('*************************** National Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", squad360TotalCount);
    await delay(1000);

}

// Main function to execute the API calls
async function main() {
    try {
        // Get access token
        const token = await getAccessToken();
        console.log('Access token:', token);

        // Get all screens using the token
        const allScreensData = await getAllScreens(token);
        console.log('Total screens count:', allScreensData.length);

        // Get all screens status
        const allScreensStatus = await getAllScreensStatus(token);
        console.log('Screens status data retrieved');

        // Filter screens with displayStatus="Active" and screenType="backwall" and format data
        const formattedScreens = filterAndFormatScreens(allScreensData, allScreensStatus, "Active", "backwall");
        console.log('Filtered screens count:', formattedScreens.length);

        // Save the renamed data to Excel
        await saveDataToExcel(formattedScreens);

        // Rename keys for the formatted data
        const renamedData = await renameAllKeyNames(formattedScreens);
        console.log('Renamed Data Successfully');

        await startMessages(renamedData);
        console.log('Screen messages sent successfully');
    } catch (error) {
        console.error('Error in main function:', error.message);
    }
}

// Execute the main function
main();
