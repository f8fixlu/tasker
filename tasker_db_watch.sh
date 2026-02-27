#!/bin/bash

#########################################
# TASKER ADVANCED REAL-TIME DB BACKUP
#########################################

DB_DIR="/home/pi/apps/tasker/backend/database"
DB_FILE="tasker.db"
DB_PATH="$DB_DIR/$DB_FILE"

TMP_BACKUP="/home/pi/tasker_tmp_db_backup.db"

REMOTE_CURRENT="gdrive_f8fixlu_crypt:db/current"
REMOTE_VERSIONS="gdrive_f8fixlu_crypt:db/versions"

LOG="/home/pi/tasker_db_watch.log"
STATUS_FILE="/home/pi/tasker_backup_status.json"

RETENTION_DAYS=14
DEBOUNCE_SECONDS=20

LAST_BACKUP_TIME=0

echo "Starting advanced DB watcher at $(date)" >> "$LOG"

rclone mkdir "$REMOTE_CURRENT" >> "$LOG" 2>&1
rclone mkdir "$REMOTE_VERSIONS" >> "$LOG" 2>&1

#########################################
# Function: Perform Safe Backup
#########################################

perform_backup() {

    NOW=$(date +%s)

    # Debounce logic
    if (( NOW - LAST_BACKUP_TIME < DEBOUNCE_SECONDS )); then
        echo "Debounce active, skipping backup." >> "$LOG"
        return
    fi

    LAST_BACKUP_TIME=$NOW
    TODAY_DATE=$(date +%Y-%m-%d)

    echo "Starting DB backup at $(date)" >> "$LOG"

    #########################################
    # WAL Checkpoint (WAL-aware)
    #########################################

    sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(FULL);" >> "$LOG" 2>&1

    #########################################
    # Integrity Check
    #########################################

    INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")

    if [ "$INTEGRITY" != "ok" ]; then
        echo "Integrity check FAILED: $INTEGRITY" >> "$LOG"
        update_status "DB_CORRUPTED"
        return
    fi

    #########################################
    # Safe Snapshot
    #########################################

    sqlite3 "$DB_PATH" ".backup '$TMP_BACKUP'"

    if [ $? -ne 0 ]; then
        echo "SQLite backup failed!" >> "$LOG"
        update_status "DB_BACKUP_FAILED"
        return
    fi

    #########################################
    # Upload Snapshot
    #########################################

    rclone copy "$TMP_BACKUP" "$REMOTE_CURRENT" \
        --backup-dir "$REMOTE_VERSIONS/$TODAY_DATE" \
        --log-file="$LOG" \
        --log-level INFO

    if [ $? -ne 0 ]; then
        update_status "DB_UPLOAD_FAILED"
        return
    fi

    #########################################
    # Retention (Full Folder Delete)
    #########################################

    TODAY_SECONDS=$(date +%s)

    rclone lsf "$REMOTE_VERSIONS" --dirs-only | while read DIR; do
        CLEAN_DIR=$(echo "$DIR" | sed 's:/$::')
        FOLDER_SECONDS=$(date -d "$CLEAN_DIR" +%s 2>/dev/null)

        if [ ! -z "$FOLDER_SECONDS" ]; then
            AGE_DAYS=$(( (TODAY_SECONDS - FOLDER_SECONDS) / 86400 ))

            if [ "$AGE_DAYS" -gt "$RETENTION_DAYS" ]; then
                echo "Deleting old DB version: $CLEAN_DIR" >> "$LOG"
                rclone purge "$REMOTE_VERSIONS/$CLEAN_DIR" >> "$LOG" 2>&1
            fi
        fi
    done

    rm -f "$TMP_BACKUP"

    update_status "DB_SUCCESS"

    echo "DB backup completed successfully." >> "$LOG"
    echo "" >> "$LOG"
}

#########################################
# Function: Update Dashboard JSON
#########################################

update_status() {

    DB_STATUS=$1

    # Preserve existing app backup fields if present
    if [ -f "$STATUS_FILE" ]; then
        EXISTING=$(cat "$STATUS_FILE")
    else
        EXISTING="{}"
    fi

    # Update only DB section
    cat <<EOF > "$STATUS_FILE"
{
  "db_status": "$DB_STATUS",
  "db_last_run": "$(date)"
}
EOF
}

#########################################
# Watch Loop
#########################################

while true
do
    inotifywait -e modify,close_write,move "$DB_DIR" >> "$LOG" 2>&1
    sleep 5
    perform_backup
done
