#!/bin/bash
echo "===== DEPLOY STARTED at $(date) =====" >> /tmp/deploy.log

cd ~/tata_wa_scripts || {
  echo "❌ ERROR: Could not cd into project folder" >> /tmp/deploy.log
  exit 1
}

# Stop the app by name
pm2 stop tata-wa >> /tmp/deploy.log 2>&1 || echo "App not running" >> /tmp/deploy.log

# Clean old code
rm -rf /root/tata_wa_scripts/node_modules >> /tmp/deploy.log 2>&1
rm -rf /root/tata_wa_scripts/src >> /tmp/deploy.log 2>&1

# Reset repo & pull latest
git reset --hard >> /tmp/deploy.log 2>&1
git checkout production >> /tmp/deploy.log 2>&1
git pull origin production >> /tmp/deploy.log 2>&1

# Install dependencies
npm install --production >> /tmp/deploy.log 2>&1

# Restart app
pm2 restart tata-wa >> /tmp/deploy.log 2>&1 || pm2 start main.js --name tata-wa

echo "===== DEPLOY COMPLETED at $(date) =====" >> /tmp/deploy.log
