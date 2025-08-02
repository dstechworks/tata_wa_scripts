const { magentaMsg } = require('../utils/whatsappMsgTempUtils');
const { delay } = require('../utils/helpers');
const querystring = require('querystring');
const moment = require('moment-timezone');
const axios = require('axios');

// Logger Intialize
const logger = require('./magenta_mobility_logger');

// server config
const apiUrl = 'http://64.227.144.217/api';
const tokenEndpointServer = 'http://64.227.144.217/api/authorize/access_token';
const clientIDServer = '557eface7c7aab1d7b2b01ab7b98be170d05df9a';
const clientSecretServer = '067ec7dc372cec886acc9b1d0540df62c125eb1f4e1e67c5cfd1143477d82cbd8b155233110f4ded15b999023988503d86162814df0d06ab9b8d9e351187f6279bdf18f91debe09caf02cb9d310fef2f540b59e831fa40db4d9511c16fbc3a432c5ead7f74128b13764a36893dcabe84ea1c41a57c5d4199a6d84bcf61738a';
let authToken = null;

let NationalPOCNum = {
    "Hitesh": "8700685675",
    // "Himanshu": "9266903109",
    // "Dhruv": "8826909378",
    // "Sumit": "8920131195",
    // "Pratek": "9818429501",
    // "Chirag": "9818875211",
    // "rusum": "9266903108",
    // "Prachi": "9022042736",
    // "Bring It On": "9881925215",
    // "Chandrasekhar Satapathy": "9820100168",
    // "Ritesh Jadhav": "9326672498",
}

async function getAccessToken() {
    const requestBody = {
        grant_type: 'client_credentials',
        client_id: clientIDServer,
        client_secret: clientSecretServer
    };
    const tokenEndpoint = tokenEndpointServer
    const response = await axios.post(tokenEndpoint, querystring.stringify(requestBody), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    authToken = response.data.access_token;
    console.log(`New token generated successfully`);
    return authToken;
}

async function getApiData() {
    const batchSize = 10;
    let offset = 0;
    const results = [];
    const token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${token}`
    };

    try {
        while (true) {
            const { data } = await axios.get(`${apiUrl}/display?start=${offset}`, { headers });
            if (data.length === 0) break;
            results.push(...data);
            offset += batchSize;
            console.log(`Offset updated to :: ${offset}`);
        }
        console.log(`Total Items Fetched :: ${results.length}`);
        return results;
    } catch (error) {
        console.error(`Error fetching data from server ${serverNumber}:`, error.message);
        throw error;
    }
}

async function startScript() {
    const server1Results = await getApiData();

    const inactiveDisplays = server1Results?.filter(item => item?.loggedIn === 0)?.map(item => item?.display)?.filter(Boolean)?.join(', ');
    const activeCount = server1Results.filter(item => item?.loggedIn === 1).length;
    const inactiveCount = server1Results.filter(item => item?.loggedIn === 0).length;
    const totalCount = server1Results.length;

    // console.log(`Active Displays: ${activeCount}`);
    // console.log(`Inactive Displays: ${inactiveCount}`);
    // console.log(`Total Displays: ${totalCount}`);
    // console.log(`Inactive Screens List : ${inactiveDisplays}`);

    console.log("\n");
    let messageBodyNP = `MAGENTA SCREEN STATUS :
Total : ${totalCount}
Active : ${activeCount}
Inactive : ${inactiveCount}
Inactive Outlets :-
${inactiveDisplays}`;
    console.log(messageBodyNP, "\n");

    await delay(8000);

    for (let key in NationalPOCNum) {
        let phoneNum = `+91${NationalPOCNum[key]}`;
        let obj = {
            "total": totalCount,
            "active": activeCount,
            "inactive": inactiveCount,
            "inactive_outlets": inactiveDisplays,
        }
        // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);

        let nationalMsgRes = await magentaMsg("magenta_offline_screens_1", null, phoneNum, obj);
        console.log(`${key} ---> ${nationalMsgRes}`);
        await delay(500);
    }
}

startScript();