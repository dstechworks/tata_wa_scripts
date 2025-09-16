const { deviceWiseBackwallStatusMsg, districtMsg, am_assistant_msg, ae_msg, tl_msg, allCombinedSystemsNationalMsg, combinedSingleSystemsNationalMsg } = require('../utils/whatsappMsgTempUtils.js');
const { delay, nameHelper, numberHelper, areAllZonesZero, naValueHelper, isNaValueFoundHelper, spaceCheckerHelper, conditionCheckerHelper } = require('../utils/helpers.js');
const { saveDataToExcel } = require('../utils/saveExcelUtils.js');
const {
  createIbcNationalMessage,
  createTabletNationalMessage,
  createSquad360NationalMessage,
  createTechworksBackwallNationalMessage,
  createDigiQuadNationalMessage,
  createCombinedNationalMessage,
  createCombinedAllSystemsNationalMessage
} = require('../utils/printMessageUtils.js');
const { google } = require('googleapis');
const { Pool } = require('pg');
const axios = require('axios');
const path = require('path');

// Logger Intialize
const logger = require('./all_combined_plus_ibc_logger');

// Supabase Connection
const pool = new Pool({
  user: "postgres",
  host: 'db.mgampbhmlnalxohuobpr.supabase.co',
  database: "postgres",
  password: 'gplVhDuxLDMeBKxs',
  port: 5432,
});

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

// Function to get DIGI-QUAD data
async function getDigiQuadData() {
  try {
    // Get data from Google Sheets
    const keyFilePath = path.join(__dirname, '../../credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const authClientObject = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClientObject });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: baseSpreadsheetId,
      range: 'Digi-Quad',
    });

    const data = response.data.values || [];
    const [headers, ...rows] = data;
    const digiQuadBaseData = rows.map(row => Object.fromEntries(headers.map((key, index) => [key, row[index]])));

    // Get data from Supabase
    const supabaseResponse = await pool.query(`SELECT * FROM digiquad_device_records WHERE branch IS NOT NULL AND branch != 'null' AND display_name IS NOT NULL AND verified = 'Yes';`);
    const digiQuadTableData = supabaseResponse.rows;

    return { digiQuadBaseData, digiQuadTableData };
  } catch (error) {
    console.error("Error fetching DIGI-QUAD data:", error);
    return { digiQuadBaseData: [], digiQuadTableData: [] };
  }
}

// Function to get TECHWORKS-BACKWALL data
async function getTechworksBackwallData() {
  try {
    // Get data from Google Sheets
    const keyFilePath = path.join(__dirname, '../../credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const authClientObject = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClientObject });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: baseSpreadsheetId,
      range: 'TW-Backwall',
    });

    const data = response.data.values || [];
    const [headers, ...rows] = data;
    const techworksBackwallBaseData = rows.map(row => Object.fromEntries(headers.map((key, index) => [key, row[index]])));

    // Get data from Supabase
    const supabaseResponse = await pool.query(`SELECT * FROM backwall_device_records WHERE branch IS NOT NULL AND branch != 'null' AND verified = 'Yes'`);
    const techworksBackwallTableData = supabaseResponse.rows;

    return { techworksBackwallBaseData, techworksBackwallTableData };
  } catch (error) {
    console.error("Error fetching TECHWORKS-BACKWALL data:", error);
    return { techworksBackwallBaseData: [], techworksBackwallTableData: [] };
  }
}

// Function to get TABLET data
async function getTabletData() {
  try {
    // Get data from Google Sheets
    const keyFilePath = path.join(__dirname, '../../credentials.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const authClientObject = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClientObject });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: baseSpreadsheetId,
      range: 'Tab',
    });

    const data = response.data.values || [];
    const [headers, ...rows] = data;
    const tabletBaseData = rows.map(row => Object.fromEntries(headers.map((key, index) => [key, row[index]])));

    // Get data from Supabase
    const supabaseResponse = await pool.query(`SELECT * FROM tab_device_records WHERE branch IS NOT NULL AND branch != 'null' AND deploy_status = 'Yes'`);
    const tabletTableData = supabaseResponse.rows;

    return { tabletBaseData, tabletTableData };
  } catch (error) {
    console.error("Error fetching TABLET data:", error);
    return { tabletBaseData: [], tabletTableData: [] };
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
      screen.screenType == "backwall"
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

async function sendMessage() {
  let getBaseSheetData = await getDataFromGoogleSheets(baseSpreadsheetId, 'BaseSheetCall');
  let getCubesSheetData = await getDataFromGoogleSheets(ibcCubesSpreadsheetId, 'CubesSheetCall');
  let baseDataSheet = workbookData["Backwall"];
  let reportDataSheet = workbookData["ibc"];

  // All Zone Status
  let ibcZoneStatus = {
    "N": { active: 0, inactive: 0 },
    "S": { active: 0, inactive: 0 },
    "E": { active: 0, inactive: 0 },
    "W": { active: 0, inactive: 0 }
  };
  let digiQuadZoneStatus = {
    "N": { active: 0, inactive: 0 },
    "S": { active: 0, inactive: 0 },
    "E": { active: 0, inactive: 0 },
    "W": { active: 0, inactive: 0 }
  };
  let techworksBackwallZoneStatus = {
    "N": { active: 0, inactive: 0 },
    "S": { active: 0, inactive: 0 },
    "E": { active: 0, inactive: 0 },
    "W": { active: 0, inactive: 0 }
  };
  let tabletZoneStatus = {
    "N": { active: 0, inactive: 0 },
    "S": { active: 0, inactive: 0 },
    "E": { active: 0, inactive: 0 },
    "W": { active: 0, inactive: 0 }
  };
  let squad360ZoneStatus = {
    "N": { active: 0, inactive: 0 },
    "S": { active: 0, inactive: 0 },
    "E": { active: 0, inactive: 0 },
    "W": { active: 0, inactive: 0 }
  };
  let combinedZoneStatus = {
    "N": { active: 0, inactive: 0 },
    "S": { active: 0, inactive: 0 },
    "E": { active: 0, inactive: 0 },
    "W": { active: 0, inactive: 0 }
  };


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

    let whatsappMessageTotalCount = 0;
    let AEDevice = {}
    let AllCombinedSystemsPOCNum = {
      "Hitesh": "8700685675",
      "Dhruv": "8826909378",
      "Sumit": "8920131195",
      "Pratek": "9818429501",
      "rusum": "9266903108",
      "Anirban Sen": "9831055203"
    }
    let NationalPOCNum = {
      "Hitesh": "8700685675",
      "Dhruv": "8826909378",
      "Sumit": "8920131195",
      "Pratek": "9818429501",
      "rusum": "9266903108",
      "Anirban Sen": "9831055203",
      "Nitsh Chabbra": "9712933048",
      "Nalin Kaushik": "9831055468",
      "Gaurav Pundlik": "9831149422",
      "Rishab Agarwal": "9734469759",
      "Milan Anandan": "9903955267",
      "Priyank Maheshwari": "9893585458"
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
    let totalDevices = 0;
    let allBranches = getAllBranch();


    /////////------------------------------- Send IBC National Message ----------------------------/////////
    console.log("Fetching IBC-BACKWALL data...");
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
        ibcZoneStatus[property.substring(0, 1)].active += parseInt(allBranches[property].active)
        ibcZoneStatus[property.substring(0, 1)].inactive += parseInt(allBranches[property].inactive)
      }
    }

    let ibcNationalMessage = createIbcNationalMessage(ibcZoneStatus);
    if (areAllZonesZero(ibcZoneStatus)) {
      console.log('All IBC-BACKWALL zones have zero active/inactive counts - stopping script');
      return;
    }

    /////////------------------------------- Get TABLET National Message ----------------------------/////////
    console.log("Fetching TABLET data...");
    const { tabletBaseData, tabletTableData } = await getTabletData();
    // Process TABLET data to calculate zone status
    if (tabletTableData.length > 0 && tabletBaseData.length > 0) {
      const currentDate = new Date(new Date().getTime() - 60 * 60 * 1000); // 1 hour buffer for tablets

      tabletTableData.forEach(device => {
        const filterData = tabletBaseData.find(base =>
          base['Device ID'] === device['device_id']
        );

        if (filterData && device?.branch) {
          const zoneLetter = device.branch.substring(0, 1);
          if (zoneLetter && tabletZoneStatus[zoneLetter]) {
            if (device?.updated_timestamp) {
              if (new Date(device.updated_timestamp) > currentDate) {
                tabletZoneStatus[zoneLetter].active++;
              } else {
                tabletZoneStatus[zoneLetter].inactive++;
              }
            }
          }
        }
      });
    }

    let tabletNationalMessage = createTabletNationalMessage(tabletZoneStatus);
    if (areAllZonesZero(tabletZoneStatus)) {
      console.log('All TABLET zones have zero active/inactive counts - stopping script');
      return;
    }

    /////////------------------------------- Get SQUAD-360 National Message ----------------------------/////////
    console.log("Fetching SQUAD-360 data...");
    const squad360Data = await getSquad360Data();
    // Process SQUAD-360 data to calculate zone status
    if (squad360Data.length > 0) {
      squad360Data.forEach(screen => {
        if (screen.branch) {
          const zoneLetter = screen.branch.substring(0, 1);
          if (zoneLetter && squad360ZoneStatus[zoneLetter]) {
            if (screen.isActive === 'Active') {
              squad360ZoneStatus[zoneLetter].active++;
            } else {
              squad360ZoneStatus[zoneLetter].inactive++;
            }
          }
        }
      });
    }

    let squad360NationalMessage = createSquad360NationalMessage(squad360ZoneStatus);
    if (areAllZonesZero(squad360ZoneStatus)) {
      console.log('All SQUAD-360 zones have zero active/inactive counts - stopping script');
      return;
    }

    /////////------------------------------- Get TECHWORKS-BACKWALL National Message ----------------------------/////////
    console.log("Fetching TECHWORKS-BACKWALL data...");
    const { techworksBackwallBaseData, techworksBackwallTableData } = await getTechworksBackwallData();
    // Process TECHWORKS-BACKWALL data to calculate zone status (matching original logic)
    if (techworksBackwallTableData.length > 0) {
      const currentDate = new Date(new Date().getTime() - 12 * 60 * 60 * 1000); // 12 hours buffer

      techworksBackwallTableData.forEach(device => {
        if (!device?.branch) return;
        if (device?.verified != 'Yes') return;

        const zoneLetter = device.branch.substring(0, 1);
        if (!techworksBackwallZoneStatus[zoneLetter]) return;

        if (device?.last_accessed) {
          if (new Date(device.last_accessed) > currentDate) {
            techworksBackwallZoneStatus[zoneLetter].active++;
          } else {
            techworksBackwallZoneStatus[zoneLetter].inactive++;
          }
        }
      });
    }

    let techworksBackwallNationalMessage = createTechworksBackwallNationalMessage(techworksBackwallZoneStatus);
    if (areAllZonesZero(techworksBackwallZoneStatus)) {
      console.log('All TECHWORKS-BACKWALL zones have zero active/inactive counts - stopping script');
      return;
    }


    /////////------------------------------- Get DIGI-QUAD National Message ----------------------------/////////
    console.log("Fetching DIGI-QUAD data...");
    const { digiQuadBaseData, digiQuadTableData } = await getDigiQuadData();
    // Process DIGI-QUAD data to calculate zone status
    if (digiQuadTableData.length > 0 && digiQuadBaseData.length > 0) {
      const currentDate = new Date(new Date().getTime() - 12 * 60 * 60 * 1000); // 12 hours buffer

      digiQuadTableData.forEach(device => {
        const filterData = digiQuadBaseData.find(base =>
          base['Device ID']?.toString().trim().toLowerCase() === device['display_name']?.toString().trim().toLowerCase()
        );

        if (filterData && device?.branch) {
          const zoneLetter = device.branch.substring(0, 1);
          if (zoneLetter && digiQuadZoneStatus[zoneLetter]) {
            if (device?.last_accessed) {
              if (new Date(device.last_accessed) > currentDate) {
                digiQuadZoneStatus[zoneLetter].active++;
              } else {
                digiQuadZoneStatus[zoneLetter].inactive++;
              }
            }
          }
        }
      });
    }
    let digiQuadNationalMessage = createDigiQuadNationalMessage(digiQuadZoneStatus);
    if (areAllZonesZero(digiQuadZoneStatus)) {
      console.log('All DIGI-QUAD zones have zero active/inactive counts - stopping script');
      return;
    }

    /////////------------------------------- Get COMBINED All Systems National Message ----------------------------/////////
    console.log("Creating combined all systems national message...");
    console.log("\n");
    let nationalCombineMessage = `${createCombinedAllSystemsNationalMessage(ibcZoneStatus, digiQuadZoneStatus, squad360ZoneStatus, techworksBackwallZoneStatus, tabletZoneStatus)}`;
    console.log(nationalCombineMessage, "\n");


    /////////------------------------------- Get COMBINED National Message ----------------------------/////////
    console.log("Creating combined national message...");
    console.log("\n");
    // Add IBC-BACKWALL counts
    combinedZoneStatus.N.active += ibcZoneStatus.N.active;
    combinedZoneStatus.N.inactive += ibcZoneStatus.N.inactive;
    combinedZoneStatus.S.active += ibcZoneStatus.S.active;
    combinedZoneStatus.S.inactive += ibcZoneStatus.S.inactive;
    combinedZoneStatus.E.active += ibcZoneStatus.E.active;
    combinedZoneStatus.E.inactive += ibcZoneStatus.E.inactive;
    combinedZoneStatus.W.active += ibcZoneStatus.W.active;
    combinedZoneStatus.W.inactive += ibcZoneStatus.W.inactive;
    // Add DIGI-QUAD counts
    combinedZoneStatus.N.active += digiQuadZoneStatus.N.active;
    combinedZoneStatus.N.inactive += digiQuadZoneStatus.N.inactive;
    combinedZoneStatus.S.active += digiQuadZoneStatus.S.active;
    combinedZoneStatus.S.inactive += digiQuadZoneStatus.S.inactive;
    combinedZoneStatus.E.active += digiQuadZoneStatus.E.active;
    combinedZoneStatus.E.inactive += digiQuadZoneStatus.E.inactive;
    combinedZoneStatus.W.active += digiQuadZoneStatus.W.active;
    combinedZoneStatus.W.inactive += digiQuadZoneStatus.W.inactive;
    // Add SQUAD-360 counts
    combinedZoneStatus.N.active += squad360ZoneStatus.N.active;
    combinedZoneStatus.N.inactive += squad360ZoneStatus.N.inactive;
    combinedZoneStatus.S.active += squad360ZoneStatus.S.active;
    combinedZoneStatus.S.inactive += squad360ZoneStatus.S.inactive;
    combinedZoneStatus.E.active += squad360ZoneStatus.E.active;
    combinedZoneStatus.E.inactive += squad360ZoneStatus.E.inactive;
    combinedZoneStatus.W.active += squad360ZoneStatus.W.active;
    combinedZoneStatus.W.inactive += squad360ZoneStatus.W.inactive;
    // Add TECHWORKS-BACKWALL counts
    combinedZoneStatus.N.active += techworksBackwallZoneStatus.N.active;
    combinedZoneStatus.N.inactive += techworksBackwallZoneStatus.N.inactive;
    combinedZoneStatus.S.active += techworksBackwallZoneStatus.S.active;
    combinedZoneStatus.S.inactive += techworksBackwallZoneStatus.S.inactive;
    combinedZoneStatus.E.active += techworksBackwallZoneStatus.E.active;
    combinedZoneStatus.E.inactive += techworksBackwallZoneStatus.E.inactive;
    combinedZoneStatus.W.active += techworksBackwallZoneStatus.W.active;
    combinedZoneStatus.W.inactive += techworksBackwallZoneStatus.W.inactive;
    // Add TABLET counts
    // combinedZoneStatus.N.active += tabletZoneStatus.N.active;
    // combinedZoneStatus.N.inactive += tabletZoneStatus.N.inactive;
    // combinedZoneStatus.S.active += tabletZoneStatus.S.active;
    // combinedZoneStatus.S.inactive += tabletZoneStatus.S.inactive;
    // combinedZoneStatus.E.active += tabletZoneStatus.E.active;
    // combinedZoneStatus.E.inactive += tabletZoneStatus.E.inactive;
    // combinedZoneStatus.W.active += tabletZoneStatus.W.active;
    // combinedZoneStatus.W.inactive += tabletZoneStatus.W.inactive;

    let combinedNationalMessage = createCombinedNationalMessage(
      combinedZoneStatus,
      ibcZoneStatus,
      digiQuadZoneStatus,
      squad360ZoneStatus,
      techworksBackwallZoneStatus,
      tabletZoneStatus
    );
    console.log(combinedNationalMessage, "\n");


    if (isMessageSent) {
      await delay(8000);
    }

    /////////------------------------------- Send All Combined Messages National Message ----------------------------/////////
    let allCombinedData = {
      "IBC-BACKWALL": ibcZoneStatus,
      "TABLET": tabletZoneStatus,
      "SQUAD-360": squad360ZoneStatus,
      "TECHWORKS-BACKWALL": techworksBackwallZoneStatus,
      "DIGI-QUAD": digiQuadZoneStatus,
    }
    for (let allCombinedSystemsPOCName in AllCombinedSystemsPOCNum) {
      let combinedPhoneNumber = `+91${AllCombinedSystemsPOCNum[allCombinedSystemsPOCName]}`;
      if (isMessageSent) {
        let combinedMsgResult = await allCombinedSystemsNationalMsg("national_poc_single_combined_temp", combinedPhoneNumber, allCombinedData);
        console.log(`All Combined Messages ${allCombinedSystemsPOCName} ---> ${combinedMsgResult}`);
        ++whatsappMessageTotalCount;
        await delay(500);
      }
    }

    console.log("\n");
    console.log('*************************** All Combined Messages National Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", whatsappMessageTotalCount);
    if (isMessageSent) {
      await delay(1000);
    }



    /////////------------------------------- Send Combined Single Messages National Message ----------------------------/////////
    let combinedSingleData = {
      "COMBINED": combinedZoneStatus,
      "TABLET": tabletZoneStatus
    }
    for (let nationalPOCName in NationalPOCNum) {
      let combinedPhoneNumber = `+91${NationalPOCNum[nationalPOCName]}`;
      if (isMessageSent) {
        let combinedMsgResult = await combinedSingleSystemsNationalMsg("national_poc_combined_temp", combinedPhoneNumber, combinedSingleData);
        console.log(`Combined Single Messages ${nationalPOCName} ---> ${combinedMsgResult}`);
        ++whatsappMessageTotalCount;
        await delay(500);
      }
    }

    console.log("\n");
    console.log('*************************** Combined Single Messages National Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", whatsappMessageTotalCount);
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
        ++whatsappMessageTotalCount;
        await delay(500);
      }
    }

    console.log("\n");
    console.log('*************************** IBC Kolkata device Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", whatsappMessageTotalCount);
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
            ++whatsappMessageTotalCount;
            await delay(500);

            // if (districtCount > 0) {
            //     let districtMsgRes = await districtMsg("district_common", "IBC-BACKWALL", obj.phoneNum, obj.branchName, obj.total, obj.active, obj.inActive);
            //     console.log("District --->", districtCount, districtMsgRes, "\n");
            //     ++whatsappMessageTotalCount;
            //     await delay(500);
            // }
          }

        }
      }
    }

    console.log('*************************** District Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", whatsappMessageTotalCount);
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
            ++whatsappMessageTotalCount;
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
            ++whatsappMessageTotalCount;
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
            ++whatsappMessageTotalCount;
            await delay(500);
          }
        }
      }
    }

    console.log("\n");
    console.log('************************ AM & Assistant Messages Done ***********************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", whatsappMessageTotalCount);
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
          ++whatsappMessageTotalCount;
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
          ++whatsappMessageTotalCount;
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
          ++whatsappMessageTotalCount;
          await delay(500);
        }
      }
    }

    console.log("\n");
    console.log('*************************** AE and TL Messages Done ************************', "\n");
    console.log("-------------------------- All Messages Sent Successful --------------------");
    console.log("TOTAL MESSAGE COUNT = ", whatsappMessageTotalCount);
  }
}

sendMessage();