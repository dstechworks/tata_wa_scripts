#!/bin/bash

# =============================================
# 🚀 PRODUCTION DEPLOY SCRIPT FOR NODE.JS APP
# 🔐 Monitored with Healthchecks.io
# =============================================

# === CONFIGURATION ===
APP_DIR="/root/tata_wa_scripts"
LOG_FILE="/tmp/deploy.log"
BRANCH="production"
PM2_APP_NAME="main"                    # Must match ecosystem.config.js
HEALTHCHECKS_UUID="YOUR-HEALTHCHECKS-UUID-HERE"  # ← Replace with your real UUID
HC_PING_UP="https://hc-ping.com/$HEALTHCHECKS_UUID"           # Ping on success
HC_PING_FAIL="https://hc-ping.com/$HEALTHCHECKS_UUID/fail"    # Ping on failure

# Move to app directory
cd "$APP_DIR" || {
  echo "❌ ERROR: Failed to cd into $APP_DIR" >> "$LOG_FILE"
  curl -fsS --retry 3 "$HC_PING_FAIL" > /dev/null || true
  exit 1
}

# === LOG START ===
echo "=======================================" >> "$LOG_FILE"
echo "🚀 DEPLOY STARTED at $(date)" >> "$LOG_FILE"
echo "Branch: $BRANCH | App: $PM2_APP_NAME" >> "$LOG_FILE"

# Notify Healthchecks.io that deploy started
curl -fsS --retry 3 "$HC_PING_UP/start" > /dev/null || true

# === STEP 1: Pull Latest Code ===
echo "📥 Fetching latest code from origin/$BRANCH..." >> "$LOG_FILE"

# Fetch latest
git fetch origin "$BRANCH" || {
  echo "❌ ERROR: git fetch failed" >> "$LOG_FILE"
  echo "💡 Check: SSH keys, internet, or repo URL" >> "$LOG_FILE"
  curl -fsS --retry 3 "$HC_PING_FAIL" > /dev/null || true
  exit 1
}

# 💥 Force cleanup: discard all local changes
echo "🧹 Forcing clean state: resetting and cleaning..." >> "$LOG_FILE"
git reset --hard origin/"$BRANCH" >> "$LOG_FILE" 2>&1 || {
  echo "❌ ERROR: Could not reset to origin/$BRANCH" >> "$LOG_FILE"
  curl -fsS --retry 3 "$HC_PING_FAIL" > /dev/null || true
  exit 1
}

# Remove untracked files/folders
git clean -fd >> "$LOG_FILE" 2>&1 || {
  echo "⚠️ Warning: git clean failed" >> "$LOG_FILE"
}

# Ensure we are on correct branch
git checkout "$BRANCH" || {
  echo "❌ ERROR: Failed to checkout $BRANCH" >> "$LOG_FILE"
  curl -fsS --retry 3 "$HC_PING_FAIL" > /dev/null || true
  exit 1
}

# === STEP 2: Install Dependencies ===
echo "🗑️ Removing old node_modules..." >> "$LOG_FILE"
rm -rf node_modules >> "$LOG_FILE" 2>&1 || {
  echo "⚠️ Warning: Could not remove node_modules (might not exist yet)" >> "$LOG_FILE"
}

# === STEP 3: Install Dependencies ===
echo "📦 Installing npm dependencies..." >> "$LOG_FILE"
npm install --production >> "$LOG_FILE" 2>&1 || {
  echo "❌ ERROR: npm install failed" >> "$LOG_FILE"
  echo "💡 Fix: Increase swap, check package.json, or network" >> "$LOG_FILE"
  curl -fsS --retry 3 "$HC_PING_FAIL" > /dev/null || true
  exit 1
}

# === STEP 4: Restart PM2 App Safely ===
echo "🔁 Restarting PM2 app: $PM2_APP_NAME" >> "$LOG_FILE"

# Start from config if first time, else restart
pm2 start ecosystem.config.js --only "$PM2_APP_NAME" || pm2 restart "$PM2_APP_NAME"

# Save process list (for boot recovery)
pm2 save >> "$LOG_FILE" 2>&1

# Show current status in log
pm2 describe "$PM2_APP_NAME" >> "$LOG_FILE" 2>&1

# === FINALIZE ===
echo "✅ DEPLOY COMPLETED SUCCESSFULLY at $(date)" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# Notify Healthchecks.io of success
curl -fsS --retry 3 "$HC_PING_UP" > /dev/null || true

exit 0