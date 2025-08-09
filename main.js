const { exec } = require('child_process');
const moment = require('moment-timezone');
const cron = require('node-cron');

const TIMEZONE = 'Asia/Kolkata';

// Print message with current time
function logWithTime(message) {
    const time = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${time}] ${message}`);
}

// Run a script using node
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

// Mon–Sat @ 10:00 AM: Run all 5 scripts
cron.schedule('0 10 * * 1-6', () => {
    runScript('Techworks Tab', 'src/techworks_tab/techworks_tab.js'); // 10 AM
    runScript('Techworks Backwall', 'src/techworks_backwall/techworks_backwall.js'); // 10 AM
    runScript('Digi Quad', 'src/digi_quad/digi_quad.js'); // 10 AM
    runScript('Squad 360', 'src/squad_360/squad_360.js'); // 10 AM
    runScript('Magenta Mobility', 'src/magenta_mobility/magenta_mobility.js'); // ONLY at 10 AM
}, { timezone: TIMEZONE });

// Mon–Sat @ 5:00 PM: Run all except Magenta Mobility
cron.schedule('55 17 * * 1-6', () => {
    runScript('Techworks Tab', 'src/techworks_tab/techworks_tab.js'); // 5 PM
    runScript('Techworks Backwall', 'src/techworks_backwall/techworks_backwall.js'); // 5 PM
    runScript('Digi Quad', 'src/digi_quad/digi_quad.js'); // 5 PM
    runScript('Squad 360', 'src/squad_360/squad_360.js'); // 5 PM
    // Magenta Mobility skipped at 5 PM
}, { timezone: TIMEZONE });

// Daily @ 12:00 PM and 5:00 PM: Run MPDU 43 Vertical
['0 12 * * *', '55 17 * * *'].forEach(schedule => {
    cron.schedule(schedule, () => {
        runScript('MPDU 43 Vertical', 'src/mpdu_43vertical/mpdu_43vertical.js'); // 12 PM & 5 PM
    }, { timezone: TIMEZONE });
});


// Run a script manually if i want to runscript manually without using cron
// runScript('Techworks Tab', 'src/techworks_tab/techworks_tab.js');
// runScript('Techworks Backwall', 'src/techworks_backwall/techworks_backwall.js');
// runScript('Digi Quad', 'src/digi_quad/digi_quad.js');
// runScript('MPDU 43 Vertical', 'src/mpdu_43vertical/mpdu_43vertical.js');
// runScript('Squad 360', 'src/squad_360/squad_360.js');
// runScript('Magenta Mobility', 'src/magenta_mobility/magenta_mobility.js');