#!/bin/bash

# Log deployment start
echo "===== DEPLOY STARTED at $(date) =====" >> /tmp/deploy.log

cd ~/tata_wa_scripts || exit 1

# Stop the app using PM2
pm2 stop 0 >> /tmp/deploy.log 2>&1

# Pull latest code from production
git pull git@github.com:dstechworks/tata_wa_scripts.git production >> /tmp/deploy.log 2>&1

# Remove node_modules
rm -rf node_modules

# Install dependencies
npm install >> /tmp/deploy.log 2>&1

# Restart the app using PM2
pm2 start 0 >> /tmp/deploy.log 2>&1

echo "===== DEPLOY COMPLETED at $(date) =====" >> /tmp/deploy.log
