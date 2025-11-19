const { TATA_BASE_URL, AUTH_TOKEN } = require('./constants');
const axios = require('axios');
// require('dotenv').config();

// let baseUrl = process.env.TATA_BASE_URL;
// let authToken = process.env.AUTH_TOKEN;

let baseUrl = TATA_BASE_URL;
let authToken = AUTH_TOKEN;

// console.log(` Base URL: ${baseUrl} , Auth Token: ${authToken}`);

const getNationalStatusText = (active = 0, inactive = 0, tempClosed = 0) => `${active} (Active) / ${inactive} (InActive) / ${tempClosed} (Temp Closed)`;
const getBranchStatusText = (active = 0, inactive = 0, tempClosed = 0) => `${active} (A) / ${inactive} (I) / ${tempClosed} (T)`;

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
async function nationalMsg(tempName, messageHeadText, phoneNum, zone) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": messageHeadText },
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

async function deviceWiseBackwallStatusMsg(tempName, messageHeadText, phoneNum, data, Status) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": data['Device ID'] },
                        { "type": "text", "text": Status }
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

async function districtMsg(tempName, messageHeadText, phoneNum, branchName, total, active, inActive) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": messageHeadText },
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

async function am_assistant_msg(tempName, messageHeadText, phoneNum, sentName, total, active, inActive) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": messageHeadText },
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

async function ae_msg(tempName, messageHeadText, phoneNum, storeName, dhanushId, tlName, tlNum, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function tl_msg(tempName, messageHeadText, phoneNum, storeName, dhanushId, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function ae_msg_techworks_backwall(tempName, messageHeadText, phoneNum, storeName, dhanushId, tlName, tlNum, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function tl_msg_techworks_backwall(tempName, messageHeadText, phoneNum, storeName, deviceId, dhanushId, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function ae_msg_digi_quad(tempName, messageHeadText, phoneNum, storeName, dhanushId, tlName, tlNum, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function tl_msg_digi_quad(tempName, messageHeadText, phoneNum, storeName, deviceId, dhanushId, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function ae_msg_squad_360(tempName, messageHeadText, phoneNum, storeName, dhanushId, tlName, tlNum, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function tl_msg_squad_360(tempName, messageHeadText, phoneNum, storeName, deviceId, dhanushId, storeNum, buttonUrl) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "source": "external",
        "template": {
            "name": tempName,
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

async function mpduNationalMsg(tempName, phoneNum, dataOfNational) {
    const national = dataOfNational[0];
    const parameters = [
        { type: "text", text: getNationalStatusText(national?.national?.active, national?.national?.inactive, national?.national?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.WBHO?.active, national?.WBHO?.inactive, national?.WBHO?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.WNAG?.active, national?.WNAG?.inactive, national?.WNAG?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.WAHM?.active, national?.WAHM?.inactive, national?.WAHM?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.EVIZ?.active, national?.EVIZ?.inactive, national?.EVIZ?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.SHYD?.active, national?.SHYD?.inactive, national?.SHYD?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.SBLR?.active, national?.SBLR?.inactive, national?.SBLR?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.SCHE?.active, national?.SCHE?.inactive, national?.SCHE?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NJPR?.active, national?.NJPR?.inactive, national?.NJPR?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.WMUM?.active, national?.WMUM?.inactive, national?.WMUM?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.WPUN?.active, national?.WPUN?.inactive, national?.WPUN?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NLUC?.active, national?.NLUC?.inactive, national?.NLUC?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NEUP?.active, national?.NEUP?.inactive, national?.NEUP?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.EORI?.active, national?.EORI?.inactive, national?.EORI?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.ECAL?.active, national?.ECAL?.inactive, national?.ECAL?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.EGAU?.active, national?.EGAU?.inactive, national?.EGAU?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NSAH?.active, national?.NSAH?.inactive, national?.NSAH?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NCHA?.active, national?.NCHA?.inactive, national?.NCHA?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NDEL?.active, national?.NDEL?.inactive, national?.NDEL?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.SKAR?.active, national?.SKAR?.inactive, national?.SKAR?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.SCOI?.active, national?.SCOI?.inactive, national?.SCOI?.tempClosed ?? 0) },
        { type: "text", text: `${national?.SERN?.active} (A) / ${national?.SERN?.inactive} (I) / ${national?.SCOI?.tempClosed ?? 0} (T) *Note: A = Active, I = Inactive, T = Temp Closed` },
    ];

    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [{
                "type": "body",
                "parameters": parameters
            },],
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
    return await requestAxios(config);
}

async function mpduBranchMsg(tempName, phoneNum, branchCode, branchCounts, inActiveOutletListStr, tempClosedOutletListStr) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": { "code": "en" },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": branchCode },
                        { "type": "text", "text": branchCounts.active },
                        { "type": "text", "text": branchCounts.inactive },
                        { "type": "text", "text": inActiveOutletListStr },
                        { "type": "text", "text": tempClosedOutletListStr }
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
    return await requestAxios(config);
}

async function vertical43InchNationalMsg(tempName, phoneNum, dataOfNational) {
    const national = dataOfNational[0];
    const parameters = [
        { type: "text", text: getNationalStatusText(national?.national?.active ?? 0, national?.national?.inactive ?? 0, national?.national?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.WMUM?.active ?? 0, national?.WMUM?.inactive ?? 0, national?.WMUM?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.ECAL?.active ?? 0, national?.ECAL?.inactive ?? 0, national?.ECAL?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NDEL?.active ?? 0, national?.NDEL?.inactive ?? 0, national?.NDEL?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NCHA?.active ?? 0, national?.NCHA?.inactive ?? 0, national?.NCHA?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.WPUN?.active ?? 0, national?.WPUN?.inactive ?? 0, national?.WPUN?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NJPR?.active ?? 0, national?.NJPR?.inactive ?? 0, national?.NJPR?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.SBLR?.active ?? 0, national?.SBLR?.inactive ?? 0, national?.SBLR?.tempClosed ?? 0) },
        { type: "text", text: getBranchStatusText(national?.NEUP?.active ?? 0, national?.NEUP?.inactive ?? 0, national?.NEUP?.tempClosed ?? 0) },
        { type: "text", text: `${national?.SHYD?.active ?? 0} (A) / ${national?.SHYD?.inactive ?? 0} (I) / ${national?.SHYD?.tempClosed ?? 0} (T) *Note: A = Active, I = Inactive, T = Temp Closed` },
    ];

    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": { "code": "en" },
            "components": [{
                "type": "body",
                "parameters": parameters,
            }],
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
    return await requestAxios(config);
}

async function vertical43InchBranchMsg(tempName, phoneNum, branchCode, branchCounts, inActiveOutletListStr, tempClosedOutletListStr) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": { "code": "en" },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": branchCode },
                        { "type": "text", "text": branchCounts.active },
                        { "type": "text", "text": branchCounts.inactive },
                        { "type": "text", "text": inActiveOutletListStr },
                        { "type": "text", "text": tempClosedOutletListStr }
                    ],
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
    return await requestAxios(config);
}

async function magentaMsg(tempName, messageHeadText, phoneNum, obj) {
    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": obj.total },
                        { "type": "text", "text": obj.active },
                        { "type": "text", "text": obj.inactive },
                        { "type": "text", "text": obj.inactive_outlets },
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

async function allCombinedSystemsNationalMsg(tempName, phoneNum, dataOfNational) {
    const parameters = [
        { type: "text", text: "IBC-BACKWALL" },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.N.active },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.N.inactive },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.S.active },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.S.inactive },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.E.active },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.E.inactive },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.W.active },
        { type: "text", text: dataOfNational["IBC-BACKWALL"]?.W.inactive },
        { type: "text", text: "TABLET" },
        { type: "text", text: dataOfNational["TABLET"]?.N.active },
        { type: "text", text: dataOfNational["TABLET"]?.N.inactive },
        { type: "text", text: dataOfNational["TABLET"]?.S.active },
        { type: "text", text: dataOfNational["TABLET"]?.S.inactive },
        { type: "text", text: dataOfNational["TABLET"]?.E.active },
        { type: "text", text: dataOfNational["TABLET"]?.E.inactive },
        { type: "text", text: dataOfNational["TABLET"]?.W.active },
        { type: "text", text: dataOfNational["TABLET"]?.W.inactive },
        { type: "text", text: "SQUAD-360" },
        { type: "text", text: dataOfNational["SQUAD-360"]?.N.active },
        { type: "text", text: dataOfNational["SQUAD-360"]?.N.inactive },
        { type: "text", text: dataOfNational["SQUAD-360"]?.S.active },
        { type: "text", text: dataOfNational["SQUAD-360"]?.S.inactive },
        { type: "text", text: dataOfNational["SQUAD-360"]?.E.active },
        { type: "text", text: dataOfNational["SQUAD-360"]?.E.inactive },
        { type: "text", text: dataOfNational["SQUAD-360"]?.W.active },
        { type: "text", text: dataOfNational["SQUAD-360"]?.W.inactive },
        { type: "text", text: "DIGI-QUAD" },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.N.active },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.N.inactive },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.S.active },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.S.inactive },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.E.active },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.E.inactive },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.W.active },
        { type: "text", text: dataOfNational["DIGI-QUAD"]?.W.inactive },
        { type: "text", text: "TECHWORKS-BACKWALL" },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.N.active },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.N.inactive },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.S.active },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.S.inactive },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.E.active },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.E.inactive },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.W.active },
        { type: "text", text: dataOfNational["TECHWORKS-BACKWALL"]?.W.inactive }
    ];

    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [{
                "type": "body",
                "parameters": parameters
            },],
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
    return await requestAxios(config);
}

async function combinedSingleSystemsNationalMsg(tempName, phoneNum, dataOfNational) {
    const parameters = [
        { type: "text", text: "COMBINED BACKWALL" },
        { type: "text", text: dataOfNational["COMBINED"]?.N.active },
        { type: "text", text: dataOfNational["COMBINED"]?.N.inactive },
        { type: "text", text: dataOfNational["COMBINED"]?.S.active },
        { type: "text", text: dataOfNational["COMBINED"]?.S.inactive },
        { type: "text", text: dataOfNational["COMBINED"]?.E.active },
        { type: "text", text: dataOfNational["COMBINED"]?.E.inactive },
        { type: "text", text: dataOfNational["COMBINED"]?.W.active },
        { type: "text", text: dataOfNational["COMBINED"]?.W.inactive },
        { type: "text", text: "TABLET" },
        { type: "text", text: dataOfNational["TABLET"]?.N.active },
        { type: "text", text: dataOfNational["TABLET"]?.N.inactive },
        { type: "text", text: dataOfNational["TABLET"]?.S.active },
        { type: "text", text: dataOfNational["TABLET"]?.S.inactive },
        { type: "text", text: dataOfNational["TABLET"]?.E.active },
        { type: "text", text: dataOfNational["TABLET"]?.E.inactive },
        { type: "text", text: dataOfNational["TABLET"]?.W.active },
        { type: "text", text: dataOfNational["TABLET"]?.W.inactive }
    ];

    let variables = JSON.stringify({
        "to": phoneNum,
        "type": "template",
        "template": {
            "name": tempName,
            "language": {
                "code": "en"
            },
            "components": [{
                "type": "body",
                "parameters": parameters
            },],
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
    return await requestAxios(config);
}

module.exports = {
    nationalMsg,
    deviceWiseBackwallStatusMsg,
    districtMsg,
    am_assistant_msg,
    ae_msg,
    tl_msg,
    tl_msg_techworks_backwall,
    ae_msg_techworks_backwall,
    ae_msg_digi_quad,
    tl_msg_digi_quad,
    ae_msg_squad_360,
    tl_msg_squad_360,
    mpduNationalMsg,
    mpduBranchMsg,
    vertical43InchNationalMsg,
    vertical43InchBranchMsg,
    magentaMsg,
    allCombinedSystemsNationalMsg,
    combinedSingleSystemsNationalMsg
};