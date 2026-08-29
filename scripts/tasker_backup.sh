#!/bin/bash

#########################################
# TASKER PRODUCTION BACKUP SCRIPT
#########################################

# === CONFIGURATION ===
SOURCE="/opt/tasker"
REMOTE_CURRENT="gdrive_f8fixlu_crypt:current"
REMOTE_VERSIONS="gdrive_f8fixlu_crypt:versions"
EXCLUDE="/opt/tasker_exclude.txt"

# Updated paths to project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$SCRIPT_DIR/logs/tasker_backup.log"
STATUS_FILE="$SCRIPT_DIR/../status/tasker_backup_status.json"

RETENTION_DAYS=30

# Directories to exclude from backup (in addition to exclude file)
# These are runtime directories that don't need backup and may cause issues
EXCLUDE_DIRS="--exclude=node_modules --exclude=.git --exclude=scripts/logs --exclude=status --exclude=.env"

#########################################

START_TIME=$(date +%s)
TODAY_DATE=$(date +%Y-%m-%d)
TODAY_SECONDS=$(date +%s)

echo "===== $(date) =====" >> "$LOG"
echo "Starting webapp backup with live exclusion..." >> "$LOG"

#########################################
# Ensure remote folders exist
#########################################

rclone mkdir "$REMOTE_CURRENT" >> "$LOG" 2>&1
rclone mkdir "$REMOTE_VERSIONS" >> "$LOG" 2>&1

#########################################
# Incremental Sync with Versioning
# Using --ignore-times for safety with live files
#########################################

echo "Running rclone sync with live file handling..." >> "$LOG"

rclone sync "$SOURCE" "$REMOTE_CURRENT" \
    --checksum \
    --exclude-from "$EXCLUDE" \
    $EXCLUDE_DIRS \
    --create-empty-src-dirs \
    --backup-dir "$REMOTE_VERSIONS/$TODAY_DATE" \
    --log-file="$LOG" \
    --log-level INFO \
    --ignore-times \
    --transfers=4 \
    --checkers=2 \
    --contimeout=60s \
    --timeout=10m

SYNC_STATUS=$?

#########################################
# Retention: Delete FULL version folders older than RETENTION_DAYS
#########################################

echo "Running retention policy..." >> "$LOG"

rclone lsf "$REMOTE_VERSIONS" --dirs-only | while read DIR; do

    CLEAN_DIR=$(echo "$DIR" | sed 's:/$::')

    # Convert YYYY-MM-DD folder name to seconds
    FOLDER_SECONDS=$(date -d "$CLEAN_DIR" +%s 2>/dev/null)

    if [ ! -z "$FOLDER_SECONDS" ]; then
        AGE_DAYS=$(( (TODAY_SECONDS - FOLDER_SECONDS) / 86400 ))

        if [ "$AGE_DAYS" -gt "$RETENTION_DAYS" ]; then
            echo "Deleting old version folder: $CLEAN_DIR ($AGE_DAYS days old)" >> "$LOG"
            rclone purge "$REMOTE_VERSIONS/$CLEAN_DIR" >> "$LOG" 2>&1
        fi
    fi

done

#########################################
# Final Status Handling
#########################################

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$SYNC_STATUS" -eq 0 ]; then
    RESULT="SUCCESS"
else
    RESULT="FAILED"
fi

# Write dashboard JSON
cat <<EOF > "$STATUS_FILE"
{
  "status": "$RESULT",
  "last_run": "$(date)",
  "duration_seconds": $DURATION
}
EOF

echo "Finished with status $RESULT (Duration: ${DURATION}s)" >> "$LOG"
echo "" >> "$LOG"

exit $SYNC_STATUS
