# Tasker Services Setup

This guide explains how to set up Tasker as systemd services on your Raspberry Pi.
The application is configured with separate services for the backend and frontend.

## Prerequisites

- Raspberry Pi with systemd (most modern Linux distributions)
- Tasker application deployed at `/home/pi/apps/tasker/`
- Frontend built and ready to serve
- Node.js and npm installed

## Setup Instructions

### 1. Build Frontend

First, build the frontend:

```bash
# Build the frontend
cd /home/pi/apps/tasker/frontend
npm run build:prod
```

### 2. Copy Service Files

```bash
# Copy the service files to systemd directory
sudo cp tasker-backend.service /etc/systemd/system/
sudo cp tasker-frontend.service /etc/systemd/system/
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd /home/pi/apps/tasker/backend
npm install

# Install frontend dependencies
cd /home/pi/apps/tasker/frontend
npm install
```

### 4. Reload Systemd

```bash
sudo systemctl daemon-reload
```

### 5. Enable and Start Services

```bash
# Enable and start the backend service
sudo systemctl enable tasker-backend
sudo systemctl start tasker-backend

# Enable and start the frontend service
sudo systemctl enable tasker-frontend
sudo systemctl start tasker-frontend
```

## Service Management Commands

```bash
# Check service status
sudo systemctl status tasker-backend
sudo systemctl status tasker-frontend

# View service logs
sudo journalctl -u tasker-backend -f
sudo journalctl -u tasker-frontend -f

# Restart services
sudo systemctl restart tasker-backend
sudo systemctl restart tasker-frontend

# Stop services
sudo systemctl stop tasker-backend
sudo systemctl stop tasker-frontend

# Disable services (stop on boot)
sudo systemctl disable tasker-backend
sudo systemctl disable tasker-frontend
```

## Verification

After starting the services, verify they are running:

```bash
# Check if processes are running
ps aux | grep node

# Check if ports are listening
sudo netstat -tlnp | grep :5000  # Backend
sudo netstat -tlnp | grep :3000  # Frontend

# Check service logs
sudo journalctl -u tasker-backend --no-pager -l
sudo journalctl -u tasker-frontend --no-pager -l

# Test the application
curl http://localhost:5000/api  # Backend API
curl http://localhost:3000      # Frontend
```

## Troubleshooting

1. **Service fails to start**: Check logs with `journalctl -u tasker-backend -f` or `journalctl -u tasker-frontend -f`
2. **Permission errors**: Ensure the pi user owns the application directory
   ```bash
   sudo chown -R pi:pi /home/pi/apps/tasker/
   ```
3. **Port conflicts**: Verify no other processes are using ports 5000 (backend) or 3000 (frontend)
4. **Dependency issues**: Make sure all Node.js dependencies are installed
5. **Frontend not loading**: Verify build exists in `/home/pi/apps/tasker/frontend/build/`

## Directory Structure

Ensure your application is structured as follows:
```
/home/pi/apps/tasker/
├── backend/
│   ├── package.json
│   ├── server.js
│   └── node_modules/
└── frontend/
    ├── package.json
    ├── server.js
    ├── build/ (contains built frontend files)
    └── node_modules/
```

## Notes

- The backend service runs on port 5000 and serves the API on `/api/*` routes
- The frontend service runs on port 3000 and serves the React application
- Both services will automatically restart if they crash
- Logs are available through the systemd journal
- Frontend communicates with backend via API calls