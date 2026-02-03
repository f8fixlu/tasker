# Tasker Services Setup

This guide explains how to set up Tasker as a systemd service on your Raspberry Pi.
The application is configured with the backend serving both the API and frontend files.

## Prerequisites

- Raspberry Pi with systemd (most modern Linux distributions)
- Tasker application deployed at `/home/pi/apps/tasker/`
- Frontend built and copied to backend's public folder
- Node.js and npm installed

## Setup Instructions

### 1. Build and Deploy Frontend

First, build the frontend and copy it to the backend's public folder:

```bash
# Build the frontend
cd /home/pi/apps/tasker/frontend
npm run build

# Copy build files to backend's public folder
cp -r build/* /home/pi/apps/tasker/backend/public/
```

### 2. Copy Service File

```bash
# Copy the main service file to systemd directory
sudo cp tasker-main.service /etc/systemd/system/
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd /home/pi/apps/tasker/backend
npm install

# Install frontend dependencies (if needed for build)
cd /home/pi/apps/tasker/frontend
npm install
```

### 4. Reload Systemd

```bash
sudo systemctl daemon-reload
```

### 5. Enable and Start Service

```bash
# Enable and start the main service
sudo systemctl enable tasker-main
sudo systemctl start tasker-main
```

## Service Management Commands

```bash
# Check service status
sudo systemctl status tasker-main

# View service logs
sudo journalctl -u tasker-main -f

# Restart service
sudo systemctl restart tasker-main

# Stop service
sudo systemctl stop tasker-main

# Disable service (stop on boot)
sudo systemctl disable tasker-main
```

## Verification

After starting the service, verify it is running:

```bash
# Check if process is running
ps aux | grep node

# Check if port is listening
sudo netstat -tlnp | grep :5000  # Backend with frontend

# Check service logs
sudo journalctl -u tasker-main --no-pager -l

# Test the application
curl http://localhost:5000
```

## Troubleshooting

1. **Service fails to start**: Check logs with `journalctl -u tasker-main -f`
2. **Permission errors**: Ensure the pi user owns the application directory
   ```bash
   sudo chown -R pi:pi /home/pi/apps/tasker/
   ```
3. **Port conflicts**: Verify no other processes are using port 5000
4. **Dependency issues**: Make sure all Node.js dependencies are installed
5. **Frontend not loading**: Verify build files are in `/home/pi/apps/tasker/backend/public/`

## Directory Structure

Ensure your application is structured as follows:
```
/home/pi/apps/tasker/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── public/ (contains frontend build files)
│   └── node_modules/
└── frontend/
    ├── package.json
    ├── server.js (optimized Express server - optional)
    └── build/ (temporary build directory)
```

## Notes

- The backend serves both the API on `/api/*` routes and frontend files on other routes
- The service will automatically restart if it crashes
- Logs are available through the systemd journal
- Port 5000 serves both API and frontend
- Frontend build files are served from the backend's public directory