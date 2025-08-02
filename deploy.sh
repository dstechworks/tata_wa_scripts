#!/bin/bash

echo "===== DEPLOY STARTED at $(date) =====" >> /tmp/deploy.log

cd ~/tata_wa_scripts || {
  echo "❌ ERROR: Could not cd into project folder" >> /tmp/deploy.log
  exit 1
}

# Load NVM (for node/npm access)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Stop existing Node.js process running main.js (if any)
echo "Stopping old Node.js process (main.js)..." >> /tmp/deploy.log
pkill -f "node.*main.js" >> /tmp/deploy.log 2>&1

# Wait a bit to ensure process is stopped
sleep 2

# Pull latest code
echo "Pulling code from origin/production..." >> /tmp/deploy.log
git pull origin production >> /tmp/deploy.log 2>&1

# Remove and reinstall dependencies
echo "Removing node_modules..." >> /tmp/deploy.log
rm -rf node_modules >> /tmp/deploy.log 2>&1

echo "Installing dependencies..." >> /tmp/deploy.log
npm install >> /tmp/deploy.log 2>&1

# Start the app in background
echo "Starting new Node.js process..." >> /tmp/deploy.log
nohup node ~/tata_wa_scripts/main.js >> /tmp/app-output.log 2>&1 &

echo "===== DEPLOY COMPLETED at $(date) =====" >> /tmp/deploy.log