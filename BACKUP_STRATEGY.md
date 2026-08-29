# Tasker Backup Strategy

## Overview

Tasker uses a **dual backup strategy** to protect your data while minimizing impact on the running application:

1. **Webapp Backup** - Daily incremental backup of application files
2. **Database Backup** - Real-time backup of database changes

## What Gets Backed Up

### Webapp Backup (Daily at 2 AM)

**Included:**
- ✅ Application source code (`frontend/src/`, `backend/`)
- ✅ Configuration files (except `.env`)
- ✅ Package files (`package.json`, `package-lock.json`)
- ✅ Static assets and public files
- ✅ Service files and scripts

**Excluded:**
- ❌ `node_modules/` - Can be regenerated with `npm install`
- ❌ `.git/` - Should be backed up separately via Git
- ❌ `build/`, `dist/` - Build artifacts, can be regenerated
- ❌ `scripts/logs/` - Log files (transient)
- ❌ `status/` - Status files (regenerated)
- ❌ `.env` - Sensitive, backup separately
- ❌ `backend/uploads/` - Large files, backup separately if needed

### Database Backup (Real-time)

**Included:**
- ✅ SQLite database (`tasker.db`)
- ✅ WAL files (checkpointed before backup)
- ✅ All tables: users, tasks, events, notifications, etc.

**Safety Features:**
- WAL checkpoint before each backup
- Integrity check before backup
- Debouncing (20s) to prevent excessive backups
- Atomic snapshots using SQLite `.backup` command

## Impact on Running Application

### Webapp Backup

**Minimal Impact** - The backup is optimized to minimize disruption:

1. **Low Priority I/O**: Uses `ionice` and `nice` to reduce priority
2. **Smart Exclusions**: Doesn't backup `node_modules/` or other large directories
3. **Incremental Sync**: Only transfers changed files
4. **Scheduled at 2 AM**: Runs during low-traffic hours
5. **Timeout Protection**: 10-minute timeout prevents hanging

**What to Expect:**
- Slight increase in I/O during backup
- No downtime or service interruption
- Files remain accessible during backup

### Database Backup

**Negligible Impact** - Designed for production use:

1. **WAL Mode**: Uses Write-Ahead Logging for non-blocking reads
2. **Checkpoint**: Full checkpoint ensures clean backup
3. **Debouncing**: Waits 20s after changes before backing up
4. **Efficient**: Only backs up on actual database changes
5. **Resource Limited**: 256MB memory, 25% CPU max

**What to Expect:**
- No noticeable performance impact
- No locking or blocking
- Continuous protection without interruption

## Backup Retention

### Webapp Backup
- **Current**: Latest version in `gdrive_f8fixlu_crypt:current`
- **Versions**: Daily versions for **30 days** in `gdrive_f8fixlu_crypt:versions/YYYY-MM-DD`
- **Automatic Cleanup**: Folders older than 30 days are deleted

### Database Backup
- **Current**: Latest version in `gdrive_f8fixlu_crypt:db/current`
- **Versions**: Daily versions for **14 days** in `gdrive_f8fixlu_crypt:db/versions/YYYY-MM-DD`
- **Automatic Cleanup**: Folders older than 14 days are deleted

## File Locations

### On Raspberry Pi
```
/opt/tasker/
├── scripts/
│   ├── tasker_backup.sh          # Webapp backup script
│   ├── tasker_db_watch.sh        # Database backup script
│   └── logs/
│       ├── tasker_backup.log     # Webapp backup logs
│       └── tasker_db_watch.log   # Database backup logs
└── status/
    └── tasker_backup_status.json # Status for dashboard
```

### Systemd Services
```
/etc/systemd/system/
├── tasker-backup.service         # Webapp backup (daily at 2 AM)
└── tasker-db-watch.service       # Database backup (continuous)
```

### Remote Storage (Google Drive)
```
gdrive_f8fixlu_crypt:
├── current/                      # Latest webapp backup
├── versions/                     # Webapp version history
│   └── YYYY-MM-DD/
└── db/
    ├── current/                  # Latest database backup
    └── versions/                 # Database version history
        └── YYYY-MM-DD/
```

## Monitoring Backups

### Dashboard
Access at: `https://your-domain.com/admin/backups`

**Features:**
- Real-time status display
- Service start/stop controls
- Manual backup trigger
- Log viewer (last 50-200 lines)
- Auto-refresh every 30 seconds

### Command Line
```bash
# Check service status
sudo systemctl status tasker-backup
sudo systemctl status tasker-db-watch

# View logs
sudo journalctl -u tasker-backup -n 50
tail -f /opt/tasker/scripts/logs/tasker_backup.log

# Check status file
cat /opt/tasker/status/tasker_backup_status.json
```

### API Endpoints
```bash
# Get backup status
curl -H "Authorization: Bearer TOKEN" \
  https://your-domain.com/api/admin/backups/status

# Get service status
curl -H "Authorization: Bearer TOKEN" \
  https://your-domain.com/api/admin/backups/services/status

# Get logs
curl -H "Authorization: Bearer TOKEN" \
  "https://your-domain.com/api/admin/backups/logs/webapp?lines=50"
```

## Best Practices

### 1. Test Restores Regularly
```bash
# Test restoring from backup
rclone copy gdrive_f8fixlu_crypt:current /tmp/restore-test
cd /tmp/restore-test && ls -la
```

### 2. Monitor Disk Space
```bash
# Check available space
df -h /opt/tasker

# Check rclone remote space
rclone about gdrive_f8fixlu_crypt:
```

### 3. Review Logs Weekly
```bash
# Check for errors
grep -i "error\|fail" /opt/tasker/scripts/logs/*.log
```

### 4. Backup .env Separately
```bash
# Encrypt and backup .env separately
gpg -c /opt/tasker/backend/.env
cp /opt/tasker/backend/.env.gpg /secure/backup/location/
```

### 5. Verify Backup Integrity
```bash
# Check database backup integrity
sqlite3 /tmp/tasker.db "PRAGMA integrity_check;"
```

## Troubleshooting

### Backup Takes Too Long
- Check network connection to cloud storage
- Reduce backup frequency or exclude more files
- Check for large files in excluded directories

### Backup Fails Frequently
- Verify rclone configuration: `rclone config show`
- Test connection: `rclone ls gdrive_f8fixlu_crypt:current`
- Check logs for specific errors

### High I/O During Backup
- Verify `ionice` settings are applied
- Check if other processes are also doing I/O
- Consider moving backup to different time

### Database Backup Not Triggering
- Check if inotify is working: `inotifywait -m /opt/tasker/backend/database`
- Verify database path in script
- Check for permission issues

## Disaster Recovery

### Full Restore Procedure

1. **Restore Webapp:**
   ```bash
   rclone copy gdrive_f8fixlu_crypt:current /opt/tasker
   cd /opt/tasker/backend && npm install
   cd /opt/tasker/frontend && npm install && npm run build
   ```

2. **Restore Database:**
   ```bash
   rclone copy gdrive_f8fixlu_crypt:db/current/tasker.db /opt/tasker/backend/database/
   ```

3. **Restore .env:**
   ```bash
   # From your secure backup
   cp /secure/backup/location/.env /opt/tasker/backend/
   ```

4. **Restart Services:**
   ```bash
   sudo systemctl restart tasker-backend tasker-frontend tasker-backup tasker-db-watch
   ```

## Security Considerations

1. **Encrypted Storage**: All backups use rclone crypt for encryption
2. **Access Control**: Only admin users can access backup dashboard
3. **API Protection**: Backup endpoints require admin authentication
4. **Log Security**: Logs don't contain sensitive data
5. **Environment Variables**: `.env` not included in regular backup

## Performance Tuning

### Adjust Backup Time
Edit `/etc/systemd/system/tasker-backup.service`:
```ini
OnCalendar=*-*-* 03:00:00  # Change to 3 AM
```

### Adjust Retention
Edit backup scripts:
```bash
RETENTION_DAYS=60  # Keep backups for 60 days
```

### Adjust Database Debounce
Edit `tasker_db_watch.sh`:
```bash
DEBOUNCE_SECONDS=60  # Wait 60 seconds after changes
```

## Support

For issues or questions:
1. Check logs first: `/opt/tasker/scripts/logs/`
2. Review dashboard: `/admin/backups`
3. Check systemd status: `systemctl status tasker-*`
4. Verify rclone: `rclone config show`
