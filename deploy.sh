#!/bin/bash

echo "===== DEPLOY STARTED at $(date) =====" >> /tmp/deploy.log

cd ~/tata_wa_scripts || {
  echo "❌ ERROR: Could not cd into project folder" >> /tmp/deploy.log
  exit 1
}

# Load NVM (if using it)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Pull latest code
echo "Pulling code from origin/production..." >> /tmp/deploy.log
git pull origin production >> /tmp/deploy.log 2>&1

# Clean and reinstall
echo "Removing node_modules..." >> /tmp/deploy.log
rm -rf node_modules >> /tmp/deploy.log 2>&1

echo "Installing dependencies..." >> /tmp/deploy.log
npm install >> /tmp/deploy.log 2>&1

# Restart app
echo "Restarting app with PM2..." >> /tmp/deploy.log
pm2 restart 0 >> /tmp/deploy.log 2>&1

# Save current PM2 process list
echo "Saving PM2 process list..." >> /tmp/deploy.log
pm2 save >> /tmp/deploy.log 2>&1

# Enable startup script (only needs to run once, safe to leave in)
echo "Setting up PM2 to start on boot..." >> /tmp/deploy.log
pm2 startup systemd -u root --hp /root >> /tmp/deploy.log 2>&1

echo "===== DEPLOY COMPLETED at $(date) =====" >> /tmp/deploy.log