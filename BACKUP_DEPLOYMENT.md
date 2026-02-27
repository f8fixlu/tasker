# Backup Deployment Guide for Raspberry Pi

This guide explains how to deploy the backup system to your Raspberry Pi.

## Prerequisites

1. **rclone installed and configured:**
   ```bash
   # Install rclone
   curl https://rclone.org/install.sh | sudo bash
   
   # Configure rclone (follow prompts)
   rclone config
   ```

2. **inotify-tools installed:**
   ```bash
   sudo apt update
   sudo apt install inotify-tools
   ```

3. **Exclude file created at `/home/pi/tasker_exclude.txt`:**
   ```
   node_modules/
   .git/
   *.log
   scripts/logs/
   status/
   .env
   ```

## Deployment Steps

### 1. Copy Files to Raspberry Pi

```bash
# Create directory structure
mkdir -p /home/pi/apps/tasker/scripts/logs
mkdir -p /home/pi/apps/tasker/status

# Copy scripts
cp tasker_backup.sh /home/pi/apps/tasker/scripts/
cp tasker_db_watch.sh /home/pi/apps/tasker/scripts/

# Copy service files
cp tasker-backup.service /home/pi/apps/tasker/
cp tasker-db-watch.service /home/pi/apps/tasker/
```

### 2. Make Scripts Executable

```bash
chmod +x /home/pi/apps/tasker/scripts/tasker_backup.sh
chmod +x /home/pi/apps/tasker/scripts/tasker_db_watch.sh
```

### 3. Update Backup Scripts Configuration

Edit the backup scripts if needed to update:
- `REMOTE_CURRENT` - Your rclone remote path for current backups
- `REMOTE_VERSIONS` - Your rclone remote path for versioned backups
- `EXCLUDE` - Path to your exclude file

```bash
nano /home/pi/apps/tasker/scripts/tasker_backup.sh
nano /home/pi/apps/tasker/scripts/tasker_db_watch.sh
```

### 4. Install Systemd Services

```bash
# Copy service files to systemd directory
sudo cp /home/pi/apps/tasker/tasker-backup.service /etc/systemd/system/
sudo cp /home/pi/apps/tasker/tasker-db-watch.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload
```

### 5. Enable and Start Services

```bash
# Enable services (start on boot)
sudo systemctl enable tasker-backup
sudo systemctl enable tasker-db-watch

# Start services
sudo systemctl start tasker-backup
sudo systemctl start tasker-db-watch
```

### 6. Verify Services

```bash
# Check service status
sudo systemctl status tasker-backup
sudo systemctl status tasker-db-watch

# View logs
sudo journalctl -u tasker-backup -f
sudo journalctl -u tasker-db-watch -f

# Check backup status file
cat /home/pi/apps/tasker/status/tasker_backup_status.json
```

## Service Descriptions

### tasker-backup.service (Webapp Backup)
- **Type:** Scheduled (runs daily at 2 AM)
- **Purpose:** Backs up entire webapp to cloud storage
- **Retention:** 30 days of versions
- **Log:** `/home/pi/apps/tasker/scripts/logs/tasker_backup.log`

### tasker-db-watch.service (Database Backup)
- **Type:** Continuous (runs forever, watches for changes)
- **Purpose:** Real-time database backup on any change
- **Retention:** 14 days of versions
- **Log:** `/home/pi/apps/tasker/scripts/logs/tasker_db_watch.log`

## Manual Backup Commands

### Trigger Manual Webapp Backup
```bash
sudo /home/pi/apps/tasker/scripts/tasker_backup.sh
```

### Check Backup Status
```bash
cat /home/pi/apps/tasker/status/tasker_backup_status.json
```

### View Recent Logs
```bash
# Last 50 lines of webapp backup log
tail -50 /home/pi/apps/tasker/scripts/logs/tasker_backup.log

# Last 50 lines of database backup log
tail -50 /home/pi/apps/tasker/scripts/logs/tasker_db_watch.log
```

## Web Dashboard

Access the backup dashboard at: `https://your-domain.com/admin/backups`

The dashboard provides:
- Real-time backup status
- Service start/stop controls
- Manual backup trigger buttons
- Log viewer

## Troubleshooting

### Service Won't Start
```bash
# Check for errors
sudo journalctl -u tasker-backup -n 50 --no-pager
sudo journalctl -u tasker-db-watch -n 50 --no-pager

# Test script manually
sudo -u pi bash /home/pi/apps/tasker/scripts/tasker_backup.sh
```

### rclone Not Working
```bash
# Test rclone connection
rclone ls gdrive_f8fixlu_crypt:current

# Check rclone config
rclone config show
```

### Permission Issues
```bash
# Fix ownership
sudo chown -R pi:pi /home/pi/apps/tasker/scripts
sudo chown -R pi:pi /home/pi/apps/tasker/status

# Fix permissions
chmod 755 /home/pi/apps/tasker/scripts
chmod 755 /home/pi/apps/tasker/scripts/logs
chmod 755 /home/pi/apps/tasker/status
```

### Database Watch Service Keeps Restarting
```bash
# Check if inotify-tools is installed
which inotifywait

# If not installed:
sudo apt install inotify-tools

# Check logs for errors
sudo journalctl -u tasker-db-watch -n 100 --no-pager
```

## Monitoring

### Check Backup Status via API
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/admin/backups/status
```

### Check Service Status via API
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/admin/backups/services/status
```

### View Logs via API
```bash
# Webapp logs (last 50 lines)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/admin/backups/logs/webapp?lines=50"

# Database logs (last 50 lines)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/admin/backups/logs/database?lines=50"
```
