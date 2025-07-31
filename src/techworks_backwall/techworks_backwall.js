const { nationalMsg } = require('../utils/whatsappMsgTempUtils.js');
const { delay, nameHelper, numberHelper, areAllZonesZero } = require('../utils/helpers.js');
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
    user: "postgres",
    host: 'db.mgampbhmlnalxohuobpr.supabase.co',
    database: "postgres",
    password: 'gplVhDuxLDMeBKxs',
    port: 5432,
});

// Logger Intialize
const logger = require('./techworks_backwall_logger');

async function sendMessage() {
    let twBackwallTotalCount = 0;
    let AEDevice = {}
    let TLDevice = [];
    let totalDevices = 0;
    let NationalPOCNum = {
        "Hitesh": "8700685675",
        "Dhruv": "8826909378",
        "Sumit": "8920131195",
        "Pratek": "9818429501",
        "Chirag": "9818875211",
        "rusum": "9266903108",
        "Karamveer": "7015266638",
        "Rahul": "9205830129",
        "Himanshu": "9266903109",
        "Sandip": "9319798915",
        "Kunal": "9818861960",
        "Aditya": "9354613112",
        "Uday": "9266903106",
        "Ritik": "9266903110",
        "Vibhas": "9266903104",
        "Anirban Sen": "9831055203",
        "Nitsh Chabbra": "9712933048",
        "Nalin Kaushik": "9831055468",
        "Gaurav Pundlik": "9831149422",
        "Karan Sehgal": "9953006252",
        "Rishab Agarwal": "9734469759",
        "unknown": "9903955267"
    }
    let zone = {
        "N": { active: 0, inactive: 0 },
        "S": { active: 0, inactive: 0 },
        "E": { active: 0, inactive: 0 },
        "W": { active: 0, inactive: 0 }
    }

    const response = await pool.query(`select * from backwall_device_records where branch is not null and branch != 'null' and verified = 'Yes'`);

    let twBackwallTableData = response.rows;
    let allBranches = getAllBranch()

    function getAllBranch() {
        let temp = {}
        mergeAllData().forEach(x => {
            temp[x['branch']] = {}
        })
        return temp
    }

    function mergeAllData() {
        let temp = [];
        // buufer time 1 hour (60 minutes)
        const currentDate = new Date(new Date().getTime() - 2 * 60 * 60 * 1000);

        twBackwallTableData.forEach(x => {
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

    mergeAllData().forEach(x => {
        // console.log(x);
        const branchZone = x.branch.charAt(0).toUpperCase();
        if (x.Status == 'Active') {
            if (zone[branchZone]) zone[branchZone].active++;
        } else {
            if (zone[branchZone]) zone[branchZone].inactive++;
        }
    })

    // console.log(zone);


    /////////------------------------------- Send National Message ----------------------------/////////
    let messageBodyNP = `NATIONAL TECHWORKS-BACKWALL STATUS
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

    await delay(7000);

    for (let key in NationalPOCNum) {
        let phoneNum = `+91${NationalPOCNum[key]}`;
        // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);

        let nationalMsgRes = await nationalMsg("national_common", "TECHWORKS-BACKWALL", phoneNum, zone);
        console.log(`${key} ---> ${nationalMsgRes}`);
        ++twBackwallTotalCount;
        await delay(500);
    }

    console.log("\n");
    console.log('*************************** National Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", twBackwallTotalCount);
    await delay(2000);



    zone = {
        "N": { active: 0, inactive: 0 },
        "S": { active: 0, inactive: 0 },
        "E": { active: 0, inactive: 0 },
        "W": { active: 0, inactive: 0 }
    }
}

sendMessage();