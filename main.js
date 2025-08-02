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










































// const cron = require('node-cron');
// const { exec } = require('child_process');
// const moment = require('moment-timezone');

// const TIMEZONE = 'Asia/Kolkata';

// // Logging with timezone
// function logWithTime(message) {
//     const time = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
//     console.log(`[${time}] ${message}`);
// }

// // Execute script utility
// function runScript(name, path) {
//     logWithTime(`Running ${name}...`);
//     exec(`node ${path}`, (error, stdout, stderr) => {
//         if (error) {
//             logWithTime(`${name} ERROR: ${error.message}`);
//             return;
//         }
//         if (stderr) {
//             logWithTime(`${name} STDERR: ${stderr}`);
//             return;
//         }
//         logWithTime(`${name} OUTPUT: ${stdout.trim()}`);
//     });
// }

// /* ===============================
//    MON–SAT Jobs @ 10:00 & 17:00 IST
//    =============================== */
// const monToSatTimes = ['0 10 * * 1-6', '0 17 * * 1-6'];
// monToSatTimes.forEach(schedule => {
//     cron.schedule(schedule, () => {
//         runScript('Techworks Tab', 'src/techworks_tab/techworks_tab.js');
//         runScript('Techworks Backwall', 'src/techworks_backwall/techworks_backwall.js');
//         runScript('Digi Quad', 'src/digi_quad/digi_quad.js');
//         runScript('Magenta Mobility', 'src/magenta_mobility/magenta_mobility.js');
//     }, { timezone: TIMEZONE });
// });

// /* ===============================
//    DAILY Job @ 11:58 & 17:00 IST
//    =============================== */
// const everyDayTimes = ['58 11 * * *', '0 17 * * *'];
// everyDayTimes.forEach(schedule => {
//     cron.schedule(schedule, () => {
//         runScript('MPDU 43 Vertical', 'src/mpdu_43vertical/mpdu_43vertical.js');
//     }, { timezone: TIMEZONE });
// });

// /* ===============================
//    MON–SAT Only @ 10:00 & 17:00 IST
//    =============================== */
// monToSatTimes.forEach(schedule => {
//     cron.schedule(schedule, () => {
//         runScript('Squad 360', 'src/squad_360/squad_360.js');
//     }, { timezone: TIMEZONE });
// });
