#!/bin/bash
cd /root/tata_wa_scripts  # 👈 path to your app on the server
git pull origin production
npm install
pm2 restart 