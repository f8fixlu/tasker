# Tasker Application Deployment with Nginx and Let's Encrypt on Raspberry Pi

This guide will walk you through setting up your Tasker application on a Raspberry Pi with Nginx as a reverse proxy and Let's Encrypt for SSL certificates. The setup will include:
- Frontend: tasker.f8fixlu.biz
- Backend API: backend.f8fixlu.biz

## Prerequisites

- Raspberry Pi (Pi 3 or 4 recommended) with Raspberry Pi OS
- Domain names added to your Cloudflare account (tasker.f8fixlu.biz and backend.f8fixlu.biz)
- Cloudflare Tunnel configured and running (cloudflared service)
- Local IP addresses: frontend on 192.168.5.202:3000, backend on 192.168.5.202:5000

## Step 1: Update System and Install Required Packages

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install nginx curl git npm nodejs -y
```

## Step 2: Install and Configure Cloudflare Tunnel (cloudflared)

If you don't have cloudflared installed yet:

```bash
# Download and install cloudflared
wget -O cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
sudo dpkg -i cloudflared.deb

# Login to Cloudflare (this will generate a configuration)
sudo cloudflared tunnel login
```

## Step 3: Create and Configure Your Tunnel

```bash
# Create a new tunnel
sudo cloudflared tunnel create tasker-tunnel

# Get the tunnel ID for configuration
sudo cloudflared tunnel list
```

Then create/edit the configuration file:

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Add the following configuration:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /root/.cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: tasker.f8fixlu.biz
    service: http://192.168.5.202:3000
  - hostname: backend.f8fixlu.biz
    service: http://192.168.5.202:5000
  # Alternative: If you want to route API calls through the same domain
  # - hostname: tasker.f8fixlu.biz
  #   path: /api/*
  #   service: http://192.168.5.202:5000
  - service: http_status:404
```

Replace `<your-tunnel-id>` with the actual tunnel ID from the previous step.

## Step 4: Set up Cloudflare Tunnel as a Service

```bash
sudo cloudflared --config /etc/cloudflared/config.yml tunnel run
sudo cloudflared service install
```

## Step 5: Configure Firewall

```bash
sudo ufw allow OpenSSH
# Note: With Cloudflare Tunnel, you don't need to expose ports 80/443 externally
# Only allow local connections if needed
sudo ufw enable
```

## Step 3: Clone and Build Your Application

```bash
cd /home/pi/apps
mkdir -p tasker
cd tasker

# If you have the code locally on the Pi, copy it here
# Or clone from your repository:
git clone https://github.com/yourusername/tasker.git .
# Note: If you're copying from your development machine, you can use rsync or scp

# Install dependencies for both frontend and backend
cd backend
npm install

cd ../frontend
npm install

# Build the frontend
npm run build
```

## Step 4: Configure Backend Service

Create a systemd service file for the backend:

```bash
sudo nano /etc/systemd/system/tasker-backend.service
```

Add the following content:

```ini
[Unit]
Description=Tasker Backend Server
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/bin/npm start
WorkingDirectory=/home/pi/apps/tasker/backend
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tasker-backend
sudo systemctl start tasker-backend
sudo systemctl status tasker-backend
```

## Step 5: Configure Frontend Service

Create a systemd service file for the frontend (using a simple static server):

```bash
sudo npm install -g serve
```

Create a service file:

```bash
sudo nano /etc/systemd/system/tasker-frontend.service
```

Add the following content:

```ini
[Unit]
Description=Tasker Frontend Server
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/bin/serve -s /home/pi/apps/tasker/frontend/build -l 3000
WorkingDirectory=/home/pi/apps/tasker/frontend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tasker-frontend
sudo systemctl start tasker-frontend
sudo systemctl status tasker-frontend
```

## Step 6: Configure Environment Variables

Update your frontend to use the correct API endpoint. In your frontend's `.env.production` file:

```
REACT_APP_API_URL=http://backend.f8fixlu.biz
```

Or update your axios interceptors/config to point to the backend domain.

## Step 7: Update Backend CORS Settings

In your backend server.js file, ensure CORS is configured to allow your frontend domain:

```javascript
app.use(cors({
  origin: ['https://tasker.f8fixlu.biz', 'https://backend.f8fixlu.biz', 'http://tasker.f8fixlu.biz', 'http://backend.f8fixlu.biz'],
  credentials: true
}));
```

## Step 8: Configure Backend Environment Variables

Create a `.env` file in your backend directory with production settings:

```bash
nano /home/pi/apps/tasker/backend/.env
```

Example content:

```
NODE_ENV=production
PORT=5000
DB_PATH=./database.sqlite
JWT_SECRET=your_production_jwt_secret
BASE_URL=https://backend.f8fixlu.biz
FRONTEND_URL=https://tasker.f8fixlu.biz
```

## Step 9: Restart Services

```bash
sudo systemctl restart tasker-backend
sudo systemctl restart tasker-frontend
sudo systemctl restart cloudflared
```

## Step 10: Verify Setup

Check if everything is working:

```bash
# Check backend service status
sudo systemctl status tasker-backend

# Check frontend service status
sudo systemctl status tasker-frontend

# Check cloudflared status
sudo systemctl status cloudflared

# Test the domains
curl -I https://tasker.f8fixlu.biz
curl -I https://backend.f8fixlu.biz
```

## Step 11: Set Up Monitoring (Optional)

You can set up basic monitoring with:

```bash
# Install and configure fail2ban for security
sudo apt install fail2ban -y

# Copy the default config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit the local config
sudo nano /etc/fail2ban/jail.local
```

## Troubleshooting

### Common Issues:

1. **Cloudflare Tunnel Issues**: Check `sudo systemctl status cloudflared`
2. **Backend Not Responding**: Check `sudo systemctl status tasker-backend`
3. **Frontend Not Responding**: Check `sudo systemctl status tasker-frontend`
4. **Domain Not Resolving**: Verify DNS records are proxied through Cloudflare (orange cloud icon)
5. **Connection Issues**: Ensure your local services are running on the correct ports (3000 for frontend, 5000 for backend)

### Useful Commands:

```bash
# Check cloudflared logs
sudo journalctl -u cloudflared -f

# Check backend logs
sudo journalctl -u tasker-backend -f

# Check frontend logs
sudo journalctl -u tasker-frontend -f

# Test local connectivity
curl http://localhost:3000
curl http://localhost:5000

# Monitor system resources
htop
```

## Maintenance

### Updating the Application:

1. Pull the latest code:
```bash
cd /home/pi/apps/tasker
git pull origin main

# Update backend dependencies
cd backend
npm install

# Rebuild frontend
cd ../frontend
npm install
npm run build
```

2. Restart services:
```bash
sudo systemctl restart tasker-backend
sudo systemctl restart tasker-frontend
```

### Cloudflare Tunnel Specific Considerations:

1. **Tunnel Health**: Monitor tunnel status regularly
```bash
sudo cloudflared tunnel info <your-tunnel-id>
```

2. **Configuration Updates**: After updating the config.yml file:
```bash
sudo systemctl restart cloudflared
```

3. **Certificate Renewal**: Cloudflare manages SSL certificates automatically for proxied domains

### Raspberry Pi Specific Considerations:

1. **Storage**: Monitor SD card space regularly
```bash
df -h
```

2. **Temperature**: Consider a heatsink or fan for sustained performance
```bash
vcgencmd measure_temp
```

3. **Swap Space**: Increase swap if needed for builds
```bash
# Check current swap
free -h

# Increase swap size if needed (example for 2GB)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

Your Tasker application should now be accessible at:
- Frontend: https://tasker.f8fixlu.biz (proxied through Cloudflare)
- Backend API: https://backend.f8fixlu.biz (proxied through Cloudflare)

The setup includes SSL certificates managed by Cloudflare, secure tunneling, and proper routing.