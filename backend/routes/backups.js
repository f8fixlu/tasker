const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths for backup scripts and status files
const SCRIPTS_DIR = path.join(__dirname, '../../scripts');
const LOGS_DIR = path.join(SCRIPTS_DIR, 'logs');
const STATUS_FILE = path.join(SCRIPTS_DIR, '../status/tasker_backup_status.json');

const WEBAPP_BACKUP_SCRIPT = path.join(SCRIPTS_DIR, 'tasker_backup.sh');
const DB_BACKUP_SCRIPT = path.join(SCRIPTS_DIR, 'tasker_db_watch.sh');
const WEBAPP_LOG = path.join(LOGS_DIR, 'tasker_backup.log');
const DB_LOG = path.join(LOGS_DIR, 'tasker_db_watch.log');

// Backup routes handler
function backupRoutes(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`Backup route handler called - Method: ${method}, Path: ${pathname}`);

  if (method === 'GET' && pathname === '/api/admin/backups/status') {
    handleGetBackupStatus(req, res);
  } else if (method === 'POST' && pathname === '/api/admin/backups/webapp/trigger') {
    handleTriggerWebappBackup(req, res);
  } else if (method === 'POST' && pathname === '/api/admin/backups/database/trigger') {
    handleTriggerDatabaseBackup(req, res);
  } else if (method === 'GET' && pathname === '/api/admin/backups/logs/webapp') {
    handleGetWebappLogs(req, res);
  } else if (method === 'GET' && pathname === '/api/admin/backups/logs/database') {
    handleGetDatabaseLogs(req, res);
  } else if (method === 'GET' && pathname === '/api/admin/backups/services/status') {
    handleGetServicesStatus(req, res);
  } else if (method === 'POST' && pathname === '/api/admin/backups/services/webapp/start') {
    handleStartWebappService(req, res);
  } else if (method === 'POST' && pathname === '/api/admin/backups/services/webapp/stop') {
    handleStopWebappService(req, res);
  } else if (method === 'POST' && pathname === '/api/admin/backups/services/database/start') {
    handleStartDatabaseService(req, res);
  } else if (method === 'POST' && pathname === '/api/admin/backups/services/database/stop') {
    handleStopDatabaseService(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backup route not found' }));
  }
}

// Get backup status from status file
async function handleGetBackupStatus(req, res) {
  try {
    // Apply admin authentication middleware
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      let status = {
        webapp: { status: 'UNKNOWN', last_run: null, duration_seconds: null },
        database: { status: 'UNKNOWN', last_run: null }
      };

      // Read status file if it exists
      if (fs.existsSync(STATUS_FILE)) {
        const data = fs.readFileSync(STATUS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // Webapp backup status
        if (parsed.status) {
          status.webapp = {
            status: parsed.status,
            last_run: parsed.last_run,
            duration_seconds: parsed.duration_seconds
          };
        }
        
        // Database backup status
        if (parsed.db_status) {
          status.database = {
            status: parsed.db_status,
            last_run: parsed.db_last_run
          };
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    });
  } catch (error) {
    console.error('Error getting backup status:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve backup status: ' + error.message }));
  }
}

// Trigger manual webapp backup
async function handleTriggerWebappBackup(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      // Execute the backup script once (not the scheduled service)
      exec(`bash "${WEBAPP_BACKUP_SCRIPT}"`, (error, stdout, stderr) => {
        if (error) {
          console.error('Webapp backup error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            error: 'Webapp backup failed', 
            details: error.message 
          }));
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          message: 'Webapp backup triggered successfully',
          output: stdout || 'Backup completed'
        }));
      });
    });
  } catch (error) {
    console.error('Error triggering webapp backup:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to trigger webapp backup: ' + error.message }));
  }
}

// Trigger manual database backup
async function handleTriggerDatabaseBackup(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      // Create a temporary one-time backup script
      const tempScript = path.join(SCRIPTS_DIR, 'tasker_db_backup_once.sh');
      
      // Create a one-time backup script
      const onceScript = `#!/bin/bash
# One-time database backup
DB_DIR="/home/pi/apps/tasker/backend/database"
DB_FILE="tasker.db"
DB_PATH="$DB_DIR/$DB_FILE"
TMP_BACKUP="/tmp/tasker_db_backup_$$.db"
REMOTE_CURRENT="gdrive_f8fixlu_crypt:db/current"
REMOTE_VERSIONS="gdrive_f8fixlu_crypt:db/versions"
LOG="${DB_LOG}"
STATUS_FILE="${STATUS_FILE}"
TODAY_DATE=$(date +%Y-%m-%d)

echo "===== Manual DB Backup $(date) =====" >> "$LOG"

# Ensure remote folders exist
rclone mkdir "$REMOTE_CURRENT" >> "$LOG" 2>&1
rclone mkdir "$REMOTE_VERSIONS" >> "$LOG" 2>&1

# WAL Checkpoint
sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(FULL);" >> "$LOG" 2>&1

# Integrity Check
INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")
if [ "$INTEGRITY" != "ok" ]; then
    echo "Integrity check FAILED: $INTEGRITY" >> "$LOG"
    # Update status preserving webapp data
    update_status "DB_CORRUPTED"
    exit 1
fi

# Safe Snapshot
sqlite3 "$DB_PATH" ".backup '$TMP_BACKUP'"
if [ $? -ne 0 ]; then
    echo "SQLite backup failed!" >> "$LOG"
    update_status "DB_BACKUP_FAILED"
    exit 1
fi

# Upload
rclone copy "$TMP_BACKUP" "$REMOTE_CURRENT" --backup-dir "$REMOTE_VERSIONS/$TODAY_DATE" --log-file="$LOG" --log-level INFO
if [ $? -ne 0 ]; then
    echo "Upload failed!" >> "$LOG"
    update_status "DB_UPLOAD_FAILED"
    rm -f "$TMP_BACKUP"
    exit 1
fi

rm -f "$TMP_BACKUP"
update_status "DB_SUCCESS"
echo "DB backup completed successfully." >> "$LOG"

# Function to update status preserving webapp data
update_status() {
    DB_STATUS=\$1
    if [ -f "$STATUS_FILE" ]; then
        EXISTING=\$(cat "$STATUS_FILE")
    else
        EXISTING="{}"
    fi
    
    WEBAPP_STATUS=\$(echo "\$EXISTING" | grep -o '"status": *"[^"]*"' | head -1 || echo '')
    WEBAPP_LAST_RUN=\$(echo "\$EXISTING" | grep -o '"last_run": *"[^"]*"' | head -1 || echo '')
    WEBAPP_DURATION=\$(echo "\$EXISTING" | grep -o '"duration_seconds": *[0-9]*' | head -1 || echo '')
    
    echo "{" > "$STATUS_FILE"
    if [ -n "\$WEBAPP_STATUS" ]; then
        echo "  \$WEBAPP_STATUS," >> "$STATUS_FILE"
    fi
    if [ -n "\$WEBAPP_LAST_RUN" ]; then
        echo "  \$WEBAPP_LAST_RUN," >> "$STATUS_FILE"
    fi
    if [ -n "\$WEBAPP_DURATION" ]; then
        echo "  \$WEBAPP_DURATION," >> "$STATUS_FILE"
    fi
    echo "  \\"db_status\\": \\"\$DB_STATUS\"," >> "$STATUS_FILE"
    echo "  \\"db_last_run\\": \\"\$(date)\\"" >> "$STATUS_FILE"
    echo "}" >> "$STATUS_FILE"
}
`;

      fs.writeFileSync(tempScript, onceScript, { mode: 0o755 });

      exec(`bash "${tempScript}"`, (error, stdout, stderr) => {
        // Clean up temp script
        fs.unlinkSync(tempScript);
        
        if (error) {
          console.error('Database backup error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            error: 'Database backup failed', 
            details: error.message 
          }));
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          message: 'Database backup triggered successfully',
          output: stdout || 'Backup completed'
        }));
      });
    });
  } catch (error) {
    console.error('Error triggering database backup:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to trigger database backup: ' + error.message }));
  }
}

// Get webapp backup logs
async function handleGetWebappLogs(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      const lines = req.url.split('&').find(p => p.startsWith('lines='));
      const numLines = lines ? parseInt(lines.split('=')[1]) : 50;

      if (!fs.existsSync(WEBAPP_LOG)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ logs: [] }));
      }

      const logContent = fs.readFileSync(WEBAPP_LOG, 'utf8');
      const allLines = logContent.split('\n').filter(line => line.trim());
      const recentLines = allLines.slice(-numLines);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs: recentLines }));
    });
  } catch (error) {
    console.error('Error getting webapp logs:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve webapp logs: ' + error.message }));
  }
}

// Get database backup logs
async function handleGetDatabaseLogs(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      const lines = req.url.split('&').find(p => p.startsWith('lines='));
      const numLines = lines ? parseInt(lines.split('=')[1]) : 50;

      if (!fs.existsSync(DB_LOG)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ logs: [] }));
      }

      const logContent = fs.readFileSync(DB_LOG, 'utf8');
      const allLines = logContent.split('\n').filter(line => line.trim());
      const recentLines = allLines.slice(-numLines);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs: recentLines }));
    });
  } catch (error) {
    console.error('Error getting database logs:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve database logs: ' + error.message }));
  }
}

// Get systemd services status
async function handleGetServicesStatus(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      // Check both services
      exec('systemctl is-active tasker-backup.service && systemctl is-active tasker-db-watch.service', (error, stdout, stderr) => {
        const output = stdout.trim().split('\n');
        const webappStatus = output[0] || 'inactive';
        const dbStatus = output[1] || 'inactive';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          webapp: {
            active: webappStatus === 'active',
            status: webappStatus
          },
          database: {
            active: dbStatus === 'active',
            status: dbStatus
          }
        }));
      });
    });
  } catch (error) {
    console.error('Error getting services status:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve services status: ' + error.message }));
  }
}

// Start webapp backup service
async function handleStartWebappService(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      exec('systemctl start tasker-backup.service', (error, stdout, stderr) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to start webapp backup service', details: error.message }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Webapp backup service started' }));
      });
    });
  } catch (error) {
    console.error('Error starting webapp service:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to start webapp backup service: ' + error.message }));
  }
}

// Stop webapp backup service
async function handleStopWebappService(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      exec('systemctl stop tasker-backup.service', (error, stdout, stderr) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to stop webapp backup service', details: error.message }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Webapp backup service stopped' }));
      });
    });
  } catch (error) {
    console.error('Error stopping webapp service:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to stop webapp backup service: ' + error.message }));
  }
}

// Start database backup service
async function handleStartDatabaseService(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      exec('systemctl start tasker-db-watch.service', (error, stdout, stderr) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to start database backup service', details: error.message }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Database backup service started' }));
      });
    });
  } catch (error) {
    console.error('Error starting database service:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to start database backup service: ' + error.message }));
  }
}

// Stop database backup service
async function handleStopDatabaseService(req, res) {
  try {
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      exec('systemctl stop tasker-db-watch.service', (error, stdout, stderr) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to stop database backup service', details: error.message }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Database backup service stopped' }));
      });
    });
  } catch (error) {
    console.error('Error stopping database service:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to stop database backup service: ' + error.message }));
  }
}

module.exports = backupRoutes;
