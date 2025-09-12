# 🚀 Auto Deployment Setup

## 🔑 SSH Key Setup
```bash
ssh-keygen -t ed25519 -C "deploy@techworks" -f ~/.ssh/deploy_key -N ""
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/deploy_key
ssh -T git@github.com
```
👉 Add `~/.ssh/deploy_key.pub` in **GitHub → Repo → Settings → Deploy keys**.

---

## 📥 Deployment Script (`deploy.sh`)
```bash
#!/bin/bash
echo "===== DEPLOY STARTED at $(date) =====" >> /tmp/deploy.log
cd /root/tata_wa_scripts || exit 1
git reset --hard
git fetch origin production
git checkout production
git pull origin production
rm -rf node_modules
npm install --production
pm2 restart tata-wa || pm2 start main.js --name tata-wa
echo "===== DEPLOY COMPLETED at $(date) =====" >> /tmp/deploy.log
```
```bash
chmod +x ~/tata_wa_scripts/deploy.sh
```

---

## ⚙️ Webhook Config (`hooks.json`)
```json
[
  {
    "id": "deploy",
    "execute-command": "/root/tata_wa_scripts/deploy.sh",
    "command-working-directory": "/root/tata_wa_scripts",
    "response-message": "🚀 Deployment started",
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "TECHWORKS_SECRET_KEY",
        "parameter": { "source": "url", "name": "token" }
      }
    }
  }
]
```

---

## ▶️ Start Webhook with PM2
```bash
sudo apt install webhook -y
pm2 start webhook --name webhook-deploy -- -hooks /root/tata_wa_scripts/hooks.json -port 9000
pm2 logs webhook-deploy
```

---

## 🌐 GitHub Webhook
- Go to **Repo → Settings → Webhooks → Add Webhook**
- Payload URL:
```
http://YOUR_SERVER_IP:9000/hooks/deploy?token=TECHWORKS_SECRET_KEY
```
- Content type: `application/json`
- Trigger: `push` event

---

## 🛠️ Helper Commands
```bash
git reset --hard HEAD
git restore .
ps aux | grep node
kill 12345
```
