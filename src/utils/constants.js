let TATA_BASE_URL = "https://wb.omni.tatatelebusiness.com";
let AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZU51bWJlciI6Iis5MTc4Mjc5NDM0NzYiLCJwaG9uZU51bWJlcklkIjoiNDY0MjgxNDcwMTA3NTA5IiwiaWF0IjoxNzMxNjY2ODE2fQ.kPVMzdR-7atWWHMIj5TgXk17PT3rE2gF3L0WdE8kWSM";
// let mpduBranchWisePOCNum = {
//     "NLUC": {
//         "Vinay Jaiswal": "8377980245",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "WMUM": {
//         "Bibhu Priyadarshi": "9552502761",
//         "Mohammed Amin Glasswala": "9930859493",
//         "Akash Sagar": "8018508203",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "WAHM": {
//         "Archish Chauhan": "9909036138",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "SHYD": {
//         "Poulami Roy": "9948307149",
//         "SURKANTI NIRANJAN": "9966332262",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "NJPR": {
//         "Himanshu Tanwar": "9529627027",
//         "Akshat Ranawat": "7073666674",
//         "Kasif": "9314933475",
//         "Sonu": "9784746786",
//         "Mahesh": "9079737882",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "EVIZ": {
//         "Harini Podagatlapalli": "6303239551",
//         "Satyadeosharan Nirala": "8349603217",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "WBHO": {
//         "Ashutosh Dwivedi": "9009912365",
//         "Bharat Singh": "6267733463",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "WNAG": {
//         "ANKUSH RATHOD": "9860068060",
//         "KISHOR SAHARE": "8421196419",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "SBLR": {
//         "Shreyas K": "8904657515",
//         "Zaid": "8217625503",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "SCHE": {
//         "SANJAY K": "9842101922",
//         "Hariharasudhan": "9176049143",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "WPUN": {
//         "Kritika": "9816671018",
//         "Danish Sayyed": "7020871947",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "EORI": {
//         "Debasis Mohanty": "9078087356",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "ECAL": {
//         "Rajdeep Ashoke Datta": "9657713025",
//         "DIPANNITA TIWARY": "9836802859",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "EGAU": {
//         "SUDIPTA RANJAN GOGOI": "7002973917",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "NSAH": {
//         "Birjesh Gautam": "9716299579",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "NCHA": {
//         "Vishal Bhardwaj": "9878425910",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "NDEL": {
//         "Amit Srivastava": "9792251777",
//         "Devendra Gupta": "8506993808",
//         "Dilip Nadel": "9918001743",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "NEUP": {
//         "Laksh Sethi": "9838347730",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "SKAR": {
//         "Sudhir Shetty": "9901322557",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "SCOI": {
//         "Gopinath R": "8610119246",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     },
//     "SERN": {
//         "Ravisankar K R": "9747260464",
//         "Hitesh": "8700685675",
//         "Sandip": "9319798915",
//         "Rohan": "9888311338"
//     }
// };

let mpduBranchWisePOCNum = {
    "NLUC": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "WMUM": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "WAHM": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "SHYD": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "NJPR": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "EVIZ": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "WBHO": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "WNAG": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "SBLR": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "SCHE": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "WPUN": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "EORI": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "ECAL": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "EGAU": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "NSAH": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "NCHA": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "NDEL": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "NEUP": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "SKAR": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "SCOI": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    },
    "SERN": {
        "Rohan": "9888311338",
        "Hitesh": "8700685675",
    }
};

module.exports = { mpduBranchWisePOCNum, TATA_BASE_URL, AUTH_TOKEN };