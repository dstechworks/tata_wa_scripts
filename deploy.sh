#!/bin/bash
LOG="/tmp/deploy.log"
echo "===== DEPLOY STARTED $(date) =====" >> "$LOG"
sleep 1
echo "Fetching code..." >> "$LOG"
sleep 1
echo "Installing dependencies..." >> "$LOG"
sleep 1
echo "Restarting app..." >> "$LOG"
echo "✅ DEPLOY FINISHED $(date)" >> "$LOG"
echo "-----------------------------" >> "$LOG"