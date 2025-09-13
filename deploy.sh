#!/bin/bash
echo "===== DEPLOY STARTED at $(date) =====" >> /tmp/deploy.log

cd ~/tata_wa_scripts || {
  echo "❌ ERROR: Could not cd into project folder" >> /tmp/deploy.log
  exit 1
}

# Stop the app by name
pm2 stop 0 >> /tmp/deploy.log 2>&1 || echo "App not running" >> /tmp/deploy.log

# Clean old code
rm -rf /root/tata_wa_scripts/node_modules >> /tmp/deploy.log 2>&1
rm -rf /root/tata_wa_scripts/src >> /tmp/deploy.log 2>&1

# Make sure we are on production
git fetch origin production
git checkout production
git reset --hard origin/production

# Install dependencies
npm install >> /tmp/deploy.log 2>&1

# Restart app
pm2 restart 0 >> /tmp/deploy.log 2>&1 || pm2 start 0 --name tata-wa

echo "===== DEPLOY COMPLETED at $(date) =====" >> /tmp/deploy.log
