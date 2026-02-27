# Tasker Application - Known Issues

## Development Server Issue
- **Problem**: Webpack dev server fails to start with error: `Invalid options object. Dev Server has been initialized using an options object that does not match the API schema. - options.allowedHosts[0] should be a non-empty string.`
- **Status**: Fixed by implementing react-app-rewired configuration
- **Solution Applied**: Created config-overrides.js to properly configure allowedHosts

## Build Issues
- **Problem**: Production build fails due to numerous linting errors
- **Status**: Workaround needed
- **Errors Include**:
  - Missing prop-types validations
  - Indentation issues
  - Unescaped entities
  - Unused variables
  - Quote style inconsistencies
  - Unknown property warnings

## Workarounds Applied
1. Created proper README.md with project documentation
2. Created comprehensive .gitignore file
3. Configured react-app-rewired to fix dev server issues
4. Documented setup and deployment instructions

## Recommended Next Steps
1. Address linting issues gradually to improve code quality
2. Consider implementing a CI/CD pipeline
3. Add unit tests for critical components
4. Consider upgrading dependencies periodically
5. Implement proper error boundaries
6. Add loading states and skeleton screens for better UX

## Deployment Notes
- The application can be built for production once linting issues are addressed
- Backend server needs to be running on port 5000
- Frontend expects API at http://localhost:5000/api
- Database migrations should be run before starting the backend

---

# Recent Updates (February 2026)

## Backup System Implementation ✅

### New Features Added

#### 1. Backup Dashboard (`/admin/backups`)
- Real-time backup status monitoring
- Service start/stop controls
- Manual backup trigger buttons
- Log viewer with filtering
- Auto-refresh every 30 seconds
- Admin-only access

#### 2. Backend API Routes
- `GET /api/admin/backups/status` - Get backup status
- `POST /api/admin/backups/webapp/trigger` - Trigger webapp backup
- `POST /api/admin/backups/database/trigger` - Trigger database backup
- `GET /api/admin/backups/logs/webapp` - Get webapp logs
- `GET /api/admin/backups/logs/database` - Get database logs
- `GET /api/admin/backups/services/status` - Get service status
- `POST /api/admin/backups/services/*/start` - Start services
- `POST /api/admin/backups/services/*/stop` - Stop services

#### 3. Systemd Services
- `tasker-backup.service` - Daily webapp backup (2 AM)
- `tasker-db-watch.service` - Continuous database backup

#### 4. Backup Scripts
- `scripts/tasker_backup.sh` - Webapp incremental backup with rclone
- `scripts/tasker_db_watch.sh` - Real-time database watch and backup

### Files Created/Modified

**New Files:**
- `backend/routes/backups.js` - Backup API routes
- `frontend/src/pages/admin/BackupStatusPage.js` - Backup dashboard
- `scripts/tasker_backup.sh` - Webapp backup script
- `scripts/tasker_db_watch.sh` - Database backup script
- `tasker-backup.service` - Webapp backup systemd service
- `tasker-db-watch.service` - Database backup systemd service
- `tasker_exclude.txt` - Backup exclusion list
- `BACKUP_DEPLOYMENT.md` - Deployment guide
- `BACKUP_STRATEGY.md` - Backup strategy documentation
- `scripts/logs/.gitkeep` - Logs directory placeholder
- `status/.gitkeep` - Status directory placeholder

**Modified Files:**
- `backend/server.js` - Registered backup routes
- `frontend/src/App.js` - Added `/admin/backups` route
- `frontend/src/components/common/Header.js` - Added "Backups" nav link
- `frontend/.env.production` - Added API URL configuration
- `.gitignore` - Added backup logs/status exclusions
- `SERVICE_SETUP.md` - Added backup services section

### Deployment Requirements

1. **Install Dependencies on Pi:**
   ```bash
   sudo apt install sqlite3 inotify-tools -y
   ```

2. **Configure Sudo Rules:**
   ```bash
   sudo visudo -f /etc/sudoers.d/tasker-backup
   # Add passwordless rules for systemctl commands
   ```

3. **Setup Directories:**
   ```bash
   mkdir -p /home/pi/apps/tasker/scripts/logs
   mkdir -p /home/pi/apps/tasker/status
   ```

4. **Copy Exclude File:**
   ```bash
   cp tasker_exclude.txt /home/pi/tasker_exclude.txt
   ```

5. **Deploy Service Files:**
   ```bash
   sudo cp tasker-backup.service /etc/systemd/system/
   sudo cp tasker-db-watch.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable tasker-backup tasker-db-watch
   ```

### Known Issues & Solutions

#### Service Control Permission Error
- **Problem**: "Interactive authentication required" when starting/stopping services
- **Solution**: Added sudo rules in `/etc/sudoers.d/tasker-backup`

#### SQLite3 Not Found
- **Problem**: Database backup fails with "sqlite3: command not found"
- **Solution**: Script now falls back to file copy if sqlite3 unavailable, but installing it is recommended

#### Rclone Config Read-Only
- **Problem**: "Failed to save config... read-only file system"
- **Solution**: Fixed rclone config directory permissions
   ```bash
   sudo chown -R pi:pi /home/pi/.config/rclone
   ```

### Backup Configuration

**Webapp Backup:**
- Schedule: Daily at 2 AM
- Retention: 30 days
- Excludes: node_modules, .git, logs, status, .env, build artifacts
- Remote: Google Drive with encryption

**Database Backup:**
- Mode: Real-time watch (triggers on file changes)
- Retention: 14 days
- Features: WAL checkpoint, integrity check, debouncing (20s)
- Remote: Google Drive with encryption

### Monitoring

- **Dashboard**: `https://tasker.f8fixlu.biz/admin/backups`
- **Logs**: `/home/pi/apps/tasker/scripts/logs/`
- **Status**: `/home/pi/apps/tasker/status/tasker_backup_status.json`
- **Systemd**: `journalctl -u tasker-backup -f`

---

## Service Architecture Update ✅

### Separated Frontend/Backend Services
- Replaced `tasker-main.service` with:
  - `tasker-backend.service` - Node.js API server (port 5000)
  - `tasker-frontend.service` - React app server (port 3000)
- Updated `SERVICE_SETUP.md` with new service structure

### Documentation Updates
- `SERVICE_SETUP.md` - Complete service setup guide
- `BACKUP_DEPLOYMENT.md` - Backup-specific deployment guide
- `BACKUP_STRATEGY.md` - Backup strategy and best practices