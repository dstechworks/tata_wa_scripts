const { exec } = require('child_process');
const moment = require('moment-timezone');
const cron = require('node-cron');

const TIMEZONE = 'Asia/Kolkata';

// Logging utility
function logWithTime(message) {
    const time = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${time}] ${message}`);
}

// Fire-and-forget script starter
function runScript(name, path) {
    logWithTime(`Starting ${name}...`);
    exec(`node ${path}`, (error, stdout, stderr) => {
        if (error) {
            logWithTime(`${name} ERROR: ${error.message}`);
            return;
        }
        if (stderr) {
            logWithTime(`${name} STDERR: ${stderr}`);
        }
        logWithTime(`${name} OUTPUT: ${stdout.trim()}`);
    });
}

// Run in fixed order, without waiting
function runInOrder() {
    runScript('Techworks Tab', 'src/techworks_tab/techworks_tab.js');
    runScript('Techworks Backwall', 'src/techworks_backwall/techworks_backwall.js');
    runScript('Digi Quad', 'src/digi_quad/digi_quad.js');
    runScript('Squad 360', 'src/squad_360/squad_360.js');
    runScript('Magenta Mobility', 'src/magenta_mobility/magenta_mobility.js');
}

/* ============== MON–SAT Jobs @ 11:00 & 17:00 IST  ====================== */
const monToSatTimes = ['0 11 * * 1-6', '0 17 * * 1-6'];
monToSatTimes.forEach(schedule => {
    cron.schedule(schedule, () => {
        runInOrder(); // Start all scripts in fixed order
    }, { timezone: TIMEZONE });
});

/* =============== DAILY Job @ 11:58 & 17:00 IST ========================== */
const everyDayTimes = ['58 11 * * *', '0 17 * * *'];
everyDayTimes.forEach(schedule => {
    cron.schedule(schedule, () => {
        // runScript('MPDU 43 Vertical', 'src/mpdu_43vertical/mpdu_43vertical.js');
    }, { timezone: TIMEZONE });
});


// const cron = require('node-cron');
// const { exec } = require('child_process');
// const moment = require('moment-timezone');
// const path = require('path');

// const TIMEZONE = 'Asia/Kolkata';

// console.log("magenta_cron.js running...");

// function logWithTime(message) {
//     const time = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
//     console.log(`[${time}] ${message}`);
// }

// function runMagentaScript() {
//     logWithTime('Running Magenta Mobility (9:36 PM daily)');

//     const magentaScriptPath = path.resolve(__dirname, 'src/magenta_mobility/magenta_mobility.js');

//     exec(`node "${magentaScriptPath}"`, (error, stdout, stderr) => {
//         if (error) {
//             logWithTime(`Magenta ERROR: ${error.message}`);
//             return;
//         }
//         if (stderr) {
//             logWithTime(`Magenta STDERR: ${stderr}`);
//             return;
//         }
//         logWithTime(`Magenta OUTPUT: ${stdout.trim()}`);
//     });
// }

// // Run every day at 21:36 IST
// cron.schedule('40 22 * * *', () => {
//     runMagentaScript();
// }, {
//     timezone: TIMEZONE
// });