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

## Backup Services Setup

Tasker includes automated backup services for both the webapp and database using rclone.

### Prerequisites for Backup

- rclone installed and configured on your Raspberry Pi
- Remote storage configured (e.g., Google Drive with encryption)
- `inotify-tools` installed for database watch functionality (`sudo apt install inotify-tools`)

### Backup Scripts Location

The backup scripts are located in `/home/pi/apps/tasker/scripts/`:
- `tasker_backup.sh` - Webapp backup script
- `tasker_db_watch.sh` - Database real-time backup script

### Logs and Status

- Logs: `/home/pi/apps/tasker/scripts/logs/`
- Status file: `/home/pi/apps/tasker/status/tasker_backup_status.json`

### Copy Backup Service Files

```bash
# Copy the backup service files to systemd directory
sudo cp tasker-backup.service /etc/systemd/system/
sudo cp tasker-db-watch.service /etc/systemd/system/
```

### Enable and Start Backup Services

```bash
# Reload systemd to recognize new services
sudo systemctl daemon-reload

# Enable and start the webapp backup service (runs on schedule)
sudo systemctl enable tasker-backup
sudo systemctl start tasker-backup

# Enable and start the database watch service (runs continuously)
sudo systemctl enable tasker-db-watch
sudo systemctl start tasker-db-watch
```

### Backup Service Management Commands

```bash
# Check backup service status
sudo systemctl status tasker-backup
sudo systemctl status tasker-db-watch

# View backup logs
sudo journalctl -u tasker-backup -f
sudo journalctl -u tasker-db-watch -f

# Restart backup services
sudo systemctl restart tasker-backup
sudo systemctl restart tasker-db-watch

# Stop backup services
sudo systemctl stop tasker-backup
sudo systemctl stop tasker-db-watch

# View backup status in dashboard
# Navigate to: https://your-domain.com/admin/backups
```

### Backup Configuration

**Webapp Backup:**
- Backs up `/home/pi/apps/tasker/` to remote storage
- Uses incremental sync with versioning
- Retention: 30 days
- Logs: `scripts/logs/tasker_backup.log`

**Database Backup:**
- Watches `/home/pi/apps/tasker/backend/database/tasker.db` for changes
- Performs real-time backups on database modifications
- Uses WAL checkpoint for safe snapshots
- Integrity check before each backup
- Retention: 14 days
- Logs: `scripts/logs/tasker_db_watch.log`

### Remote Storage Configuration

Update the `REMOTE_CURRENT` and `REMOTE_VERSIONS` variables in the backup scripts to match your rclone remote configuration:

```bash
# Example configuration (update with your remote name)
REMOTE_CURRENT="gdrive_f8fixlu_crypt:current"
REMOTE_VERSIONS="gdrive_f8fixlu_crypt:versions"
```

### Exclude File

Create an exclude file at `/home/pi/tasker_exclude.txt` to specify files/folders to exclude from backup:

```
node_modules/
.git/
*.log
scripts/logs/
status/
```

### Monitoring Backups

You can monitor backup status through:
1. **Admin Dashboard**: Navigate to `/admin/backups` in your browser
2. **Status file**: Check `/home/pi/apps/tasker/status/tasker_backup_status.json`
3. **Logs**: View logs in `scripts/logs/` directory
4. **Systemd**: Use `journalctl` commands shown above