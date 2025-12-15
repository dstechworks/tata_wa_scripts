// this file is used to schedule the ibc automation cron job

const { exec } = require('child_process');
const moment = require('moment-timezone');
const cron = require('node-cron');
const path = require('path');

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

const scriptPath = path.join(__dirname, 'ibc_automation.js');

// Mon–Sat @ 10:30 AM
cron.schedule('30 10 * * 1-6', () => {
    runScript('IBC Automation', scriptPath); // 10:30 AM
}, { timezone: TIMEZONE });

// Mon–Sat @ 5:00 PM
cron.schedule('55 13 * * 1-6', () => {
    runScript('IBC Automation', scriptPath); // 05:00 PM
}, { timezone: TIMEZONE });

console.log(`Cron jobs started at ${moment().tz(TIMEZONE).format('YYYY-MM-DD hh:mm:ss A')}`);

// Run a script manually if i want to runscript manually without using cron
// runScript('IBC Automation', scriptPath);