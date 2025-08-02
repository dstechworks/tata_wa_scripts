#!/bin/bash

echo "===== DEPLOY STARTED at $(date) =====" >> /tmp/deploy.log

cd ~/tata_wa_scripts || {
  echo "❌ ERROR: Could not cd into project folder" >> /tmp/deploy.log
  exit 1
}

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Git Pull
echo "Pulling latest code from origin/production..." >> /tmp/deploy.log
git pull origin production >> /tmp/deploy.log 2>&1

# Clean install
echo "Removing node_modules..." >> /tmp/deploy.log
rm -rf node_modules >> /tmp/deploy.log 2>&1

echo "Installing dependencies..." >> /tmp/deploy.log
npm install >> /tmp/deploy.log 2>&1

# Restart PM2 App
echo "Restarting app..." >> /tmp/deploy.log
pm2 restart 0 >> /tmp/deploy.log 2>&1

echo "===== DEPLOY COMPLETED at $(date) =====" >> /tmp/deploy.log