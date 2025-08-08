const axios = require('axios');
require('dotenv').config();

let baseUrl = process.env.TATA_BASE_URL;
let authToken = process.env.AUTH_TOKEN;

const getStatusText = (active = 0, inactive = 0) => `${active} (Active) / ${inactive} (Inactive)`;

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
                    "index": "0",
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
                    "index": "0",
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
    const parameters = [
        { type: "text", text: getStatusText(dataOfNational[0]?.national?.active, dataOfNational[0]?.national?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.WBHO?.active, dataOfNational[0]?.WBHO?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.WNAG?.active, dataOfNational[0]?.WNAG?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.WAHM?.active, dataOfNational[0]?.WAHM?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.EVIZ?.active, dataOfNational[0]?.EVIZ?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SHYD?.active, dataOfNational[0]?.SHYD?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SBLR?.active, dataOfNational[0]?.SBLR?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SCHE?.active, dataOfNational[0]?.SCHE?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NJPR?.active, dataOfNational[0]?.NJPR?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.WMUM?.active, dataOfNational[0]?.WMUM?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.WPUN?.active, dataOfNational[0]?.WPUN?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NLUC?.active, dataOfNational[0]?.NLUC?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NEUP?.active, dataOfNational[0]?.NEUP?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.EORI?.active, dataOfNational[0]?.EORI?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.ECAL?.active, dataOfNational[0]?.ECAL?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.EGAU?.active, dataOfNational[0]?.EGAU?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NSAH?.active, dataOfNational[0]?.NSAH?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NCHA?.active, dataOfNational[0]?.NCHA?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NDEL?.active, dataOfNational[0]?.NDEL?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SKAR?.active, dataOfNational[0]?.SKAR?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SCOI?.active, dataOfNational[0]?.SCOI?.inactive) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SERN?.active, dataOfNational[0]?.SERN?.inactive) }
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

async function mpduBranchMsg(tempName, phoneNum, branchCode, branchCounts, inActiveOutletListStr) {
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
                        { "type": "text", "text": inActiveOutletListStr }
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
    const parameters = [
        { type: "text", text: getStatusText(dataOfNational[0]?.national?.active ?? 0, dataOfNational[0]?.national?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.WMUM?.active ?? 0, dataOfNational[0]?.WMUM?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.ECAL?.active ?? 0, dataOfNational[0]?.ECAL?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NDEL?.active ?? 0, dataOfNational[0]?.NDEL?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NCHA?.active ?? 0, dataOfNational[0]?.NCHA?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.WPUN?.active ?? 0, dataOfNational[0]?.WPUN?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NJPR?.active ?? 0, dataOfNational[0]?.NJPR?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SBLR?.active ?? 0, dataOfNational[0]?.SBLR?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.NEUP?.active ?? 0, dataOfNational[0]?.NEUP?.inactive ?? 0) },
        { type: "text", text: getStatusText(dataOfNational[0]?.SHYD?.active ?? 0, dataOfNational[0]?.SHYD?.inactive ?? 0) },
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

async function vertical43InchBranchMsg(tempName, phoneNum, branchCode, branchCounts, inActiveOutletListStr) {
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
                        { "type": "text", "text": inActiveOutletListStr }],
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
    magentaMsg
};