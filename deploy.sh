#!/bin/bash

# === CONFIGURATION ===
PROJECT_DIR="/root/tata_wa_scripts"
LOG_USER="ubuntu"  # 👈 Change to your actual SSH username!
LOG_FILE="/home/$LOG_USER/logs/deploy.log"

# Ensure log directory exists
mkdir -p "/home/$LOG_USER/logs"

# Make sure the log file is writable by the user (optional, but safe)
touch "/home/$LOG_USER/logs/deploy.log"
chown "$LOG_USER:$LOG_USER" "/home/$LOG_USER/logs" "/home/$LOG_USER/logs/deploy.log" > /dev/null 2>&1 || true

# === LOG START ===
echo "===== DEPLOY STARTED at $(date) =====" >> "$LOG_FILE"

# === CHANGE TO PROJECT DIRECTORY ===
cd "$PROJECT_DIR" || {
  echo "❌ ERROR: Could not cd into $PROJECT_DIR" >> "$LOG_FILE"
  exit 1
}

# === STOP PM2 APP ===
pm2 stop 0 >> "$LOG_FILE" 2>&1 || echo "App not running or pm2 error" >> "$LOG_FILE"

# === CLEAN OLD CODE ===
rm -rf node_modules >> "$LOG_FILE" 2>&1
rm -rf src >> "$LOG_FILE" 2>&1

# === GIT UPDATE ===
git fetch origin production || { echo "❌ git fetch failed" >> "$LOG_FILE"; exit 1; }
git checkout production || { echo "❌ git checkout failed" >> "$LOG_FILE"; exit 1; }
git reset --hard origin/production || { echo "❌ git reset failed" >> "$LOG_FILE"; exit 1; }

# === INSTALL DEPENDENCIES ===
npm install >> "$LOG_FILE" 2>&1 || { echo "❌ npm install failed" >> "$LOG_FILE"; exit 1; }

# === RESTART APP ===
pm2 restart 0 >> "$LOG_FILE" 2>&1 || pm2 start 0 --name tata-wa >> "$LOG_FILE" 2>&1

# === FINALIZE LOG ===
echo "===== DEPLOY COMPLETED at $(date) =====" >> "$LOG_FILE"

# Optional: Make sure the log remains accessible
chown -R "$LOG_USER:$LOG_USER" "/home/$LOG_USER/logs" > /dev/null 2>&1 || true