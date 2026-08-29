# Self-Hosting Tasker with Cloudflare Tunnel

This guide will walk you through setting up Tasker (frontend and backend) on a Raspberry Pi with Cloudflare Tunnel for secure external access.

## Prerequisites

- Raspberry Pi with internet access
- Cloudflare account
- Domain managed by Cloudflare
- Basic knowledge of SSH and command line

## Step 1: Prepare Your Raspberry Pi

1. Update your Raspberry Pi:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install Node.js and npm:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Install Git:
   ```bash
   sudo apt install git -y
   ```

## Step 2: Clone and Setup Tasker Backend

1. Clone your Tasker repository:
   ```bash
   cd ~
   git clone <your-repo-url> tasker
   cd ~/tasker/backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```bash
   nano .env
   ```
   
   Add your environment variables:
   ```
   DB_PATH=./tasker.db
   PORT=5000
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   JWT_REFRESH_SECRET=your-refresh-token-secret-make-this-long-too
   ```

## Step 3: Setup Tasker Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ~/tasker/frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Build the frontend for production:
   ```bash
   npm run build
   ```

## Step 4: Configure Backend for Production

1. Copy the built frontend to the backend's public directory:
   ```bash
   mkdir -p ~/tasker/backend/public
   cp -r ~/tasker/frontend/build/* ~/tasker/backend/public/
   ```

2. Update the backend's environment file to reflect your domain:
   ```bash
   nano ~/tasker/backend/.env
   ```
   
   Add or update:
   ```
   DB_PATH=./tasker.db
   PORT=5000
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   JWT_REFRESH_SECRET=your-refresh-token-secret-make-this-long-too
   NODE_ENV=production
   ```

## Step 5: Install and Configure Cloudflare Tunnel

1. Install Cloudflare Tunnel (cloudflared):
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
   sudo dpkg -i cloudflared.deb
   ```

2. Authenticate cloudflared with your Cloudflare account:
   ```bash
   cloudflared tunnel login
   ```

3. Create a tunnel:
   ```bash
   cloudflared tunnel create tasker
   ```

4. Create the configuration file:
   ```bash
   mkdir -p ~/.cloudflared
   nano ~/.cloudflared/config.yml
   ```

5. Add the following configuration:
   ```yaml
   tunnel: <your-tunnel-id-from-previous-step>
   credentials-file: ~/.cloudflared/<your-tunnel-id>.json

   ingress:
     - hostname: yourdomain.com
       path: /api/*
       service: http://localhost:5000
     - hostname: yourdomain.com
       service: http://localhost:5000
   ```

   Replace `yourdomain.com` with your actual domain and `<your-tunnel-id>` with the ID from the `cloudflared tunnel create` command.

## Step 6: Create Systemd Services

1. Create a systemd service for the backend:
   ```bash
   sudo nano /etc/systemd/system/tasker-backend.service
   ```

2. Add the following content:
   ```ini
   [Unit]
   Description=Tasker Backend
   After=network.target

   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/opt/tasker/backend
   ExecStart=/usr/bin/node server.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. Create a systemd service for Cloudflare Tunnel:
   ```bash
   sudo nano /etc/systemd/system/cloudflared.service
   ```

4. Add the following content:
   ```ini
   [Unit]
   Description=Cloudflare Tunnel
   After=network.target

   [Service]
   Type=exec
   User=root
   ExecStart=/usr/local/bin/cloudflared tunnel run
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

## Step 7: Configure DNS

1. In your Cloudflare dashboard, go to the DNS section
2. Create a CNAME record:
   - Name: `your-subdomain` (or `@` for root domain)
   - Type: `CNAME`
   - Content: `<your-tunnel-id>.cfargotunnel.com`
   - Proxy status: Proxied

## Step 8: Start Services

1. Reload systemd:
   ```bash
   sudo systemctl daemon-reload
   ```

2. Start and enable the backend service:
   ```bash
   sudo systemctl start tasker-backend
   sudo systemctl enable tasker-backend
   ```

3. Start and enable the Cloudflare Tunnel service:
   ```bash
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

4. Check the status of both services:
   ```bash
   sudo systemctl status tasker-backend
   sudo systemctl status cloudflared
   ```

## Step 9: Verification

1. Check if your backend is running locally:
   ```bash
   curl http://localhost:5000
   ```

2. Check the logs for both services:
   ```bash
   sudo journalctl -u tasker-backend -f
   sudo journalctl -u cloudflared -f
   ```

## Step 10: Access Your Application

1. Visit `https://your-subdomain.yourdomain.com` in your browser
2. You should see the Tasker application
3. Register and test the functionality

## Troubleshooting

### Common Issues:

1. **Application not loading**: Check if the frontend build is in the backend's public directory
2. **API calls failing**: Verify the tunnel configuration includes both API and non-API routes
3. **Slow loading**: Check the bundle size of your frontend build
4. **Connection issues**: Verify DNS settings and tunnel status

### Useful Commands:

- Check backend logs: `sudo journalctl -u tasker-backend -f`
- Check tunnel logs: `sudo journalctl -u cloudflared -f`
- Restart backend: `sudo systemctl restart tasker-backend`
- Restart tunnel: `sudo systemctl restart cloudflared`
- Check tunnel status: `cloudflared tunnel info tasker`

### Updating the Application:

1. Pull latest changes:
   ```bash
   cd ~/tasker
   git pull
   ```

2. Update backend:
   ```bash
   cd ~/tasker/backend
   npm install
   ```

3. Update frontend:
   ```bash
   cd ~/tasker/frontend
   npm install
   npm run build
   cp -r build/* ../backend/public/
   ```

4. Restart the backend service:
   ```bash
   sudo systemctl restart tasker-backend
   ```

## Security Considerations

- Keep your JWT secrets secure and rotate them periodically
- Regularly update Node.js and dependencies
- Monitor access logs for suspicious activity
- Use strong passwords for user accounts
- Keep your Raspberry Pi OS updated