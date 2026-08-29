#!/bin/bash

#########################################
# TASKER ADVANCED REAL-TIME DB BACKUP
#########################################

DB_DIR="/opt/tasker/backend/database"
DB_FILE="tasker.db"
DB_PATH="$DB_DIR/$DB_FILE"

TMP_BACKUP="/tmp/tasker_tmp_db_backup.db"

REMOTE_CURRENT="gdrive_f8fixlu_crypt:db/current"
REMOTE_VERSIONS="gdrive_f8fixlu_crypt:db/versions"

# Updated paths to project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$SCRIPT_DIR/logs/tasker_db_watch.log"
STATUS_FILE="$SCRIPT_DIR/../status/tasker_backup_status.json"

RETENTION_DAYS=14
DEBOUNCE_SECONDS=1800  # 30 minutes - notification jobs run every 5 min, backup less frequently

# Track last backup hash to detect actual changes
LAST_BACKUP_HASH_FILE="/tmp/tasker_db_last_hash"

LAST_BACKUP_TIME=0

# Prevent rclone from trying to update config (causes errors on read-only filesystems)
export RCLONE_CONFIG="/opt/tasker/rclone.conf"

echo "Starting advanced DB watcher at $(date)" >> "$LOG"

rclone mkdir "$REMOTE_CURRENT" >> "$LOG" 2>&1
rclone mkdir "$REMOTE_VERSIONS" >> "$LOG" 2>&1

#########################################
# Function: Get Database Hash
#########################################

get_db_hash() {
    if command -v sqlite3 &> /dev/null; then
        # Only monitor tasks and events tables for actual user activity
        # Hash only user-modifiable content fields (exclude status which changes from auto-overdue)
        sqlite3 "$DB_PATH" "
            SELECT GROUP_CONCAT(title || '|' || COALESCE(description,'') || '|' || COALESCE(priority,'')) 
            FROM (SELECT title, description, priority FROM tasks ORDER BY id DESC LIMIT 100);
        " 2>/dev/null | head -1 > /tmp/tasks_hash.tmp
        
        sqlite3 "$DB_PATH" "
            SELECT GROUP_CONCAT(title || '|' || COALESCE(description,'') || '|' || COALESCE(start_date,'')) 
            FROM (SELECT title, description, start_date FROM events ORDER BY id DESC LIMIT 100);
        " 2>/dev/null | head -1 > /tmp/events_hash.tmp
        
        # Debug: Log actual content being hashed (first 500 chars)
        echo "Tasks content: $(cat /tmp/tasks_hash.tmp 2>/dev/null | head -c 500)" >> "$LOG"
        echo "Events content: $(cat /tmp/events_hash.tmp 2>/dev/null | head -c 500)" >> "$LOG"
        echo "Tasks hash: $(cat /tmp/tasks_hash.tmp 2>/dev/null | md5sum | cut -d' ' -f1)" >> "$LOG"
        echo "Events hash: $(cat /tmp/events_hash.tmp 2>/dev/null | md5sum | cut -d' ' -f1)" >> "$LOG"
        
        # Combine hashes
        cat /tmp/tasks_hash.tmp /tmp/events_hash.tmp 2>/dev/null | md5sum | cut -d' ' -f1
    else
        # Fallback: use file modification time
        stat -c %Y "$DB_PATH" 2>/dev/null
    fi
}

#########################################
# Function: Perform Safe Backup
#########################################

perform_backup() {

    NOW=$(date +%s)

    # Debounce logic - wait at least DEBOUNCE_SECONDS between backups
    if (( NOW - LAST_BACKUP_TIME < DEBOUNCE_SECONDS )); then
        echo "Debounce active, skipping backup (last backup was $((NOW - LAST_BACKUP_TIME))s ago)." >> "$LOG"
        return
    fi

    # Check if database actually changed
    CURRENT_HASH=$(get_db_hash)
    if [ -f "$LAST_BACKUP_HASH_FILE" ]; then
        LAST_HASH=$(cat "$LAST_BACKUP_HASH_FILE")
        echo "Comparing hashes - Current: $CURRENT_HASH, Last: $LAST_HASH" >> "$LOG"
        if [ "$CURRENT_HASH" = "$LAST_HASH" ]; then
            echo "Database unchanged (tasks/events), skipping backup." >> "$LOG"
            return
        fi
        echo "Database changed (tasks/events detected), proceeding with backup..." >> "$LOG"
    else
        echo "No previous hash found, will backup." >> "$LOG"
    fi
    
    LAST_BACKUP_TIME=$NOW
    TODAY_DATE=$(date +%Y-%m-%d)

    echo "Starting DB backup at $(date)" >> "$LOG"

    #########################################
    # WAL Checkpoint (WAL-aware)
    #########################################

    # Only run if sqlite3 is available
    if command -v sqlite3 &> /dev/null; then
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
    else
        echo "sqlite3 not found, skipping WAL checkpoint and integrity check" >> "$LOG"
    fi

    #########################################
    # Safe Snapshot
    #########################################

    if command -v sqlite3 &> /dev/null; then
        sqlite3 "$DB_PATH" ".backup '$TMP_BACKUP'"

        if [ $? -ne 0 ]; then
            echo "SQLite backup failed!" >> "$LOG"
            update_status "DB_BACKUP_FAILED"
            return
        fi
    else
        # Fallback: simple copy (less safe for active databases)
        cp "$DB_PATH" "$TMP_BACKUP"
        if [ $? -ne 0 ]; then
            echo "File copy failed!" >> "$LOG"
            update_status "DB_BACKUP_FAILED"
            return
        fi
    fi

    #########################################
    # Upload Snapshot
    #########################################

    # Use --no-check-dest and --ignore-existing to reduce config writes
    # Store rclone output in temp file to check exit code properly
    RCLONE_OUTPUT=$(mktemp)
    
    rclone copy "$TMP_BACKUP" "$REMOTE_CURRENT" \
        --backup-dir "$REMOTE_VERSIONS/$TODAY_DATE" \
        --log-file="$LOG" \
        --log-level INFO \
        --no-check-dest \
        --ignore-existing \
        --transfers=2 \
        --checkers=2 \
        2>&1 | grep -v "Failed to save config" > "$RCLONE_OUTPUT"
    
    # Get rclone's exit code (not grep's) using PIPESTATUS
    RCLONE_EXIT=${PIPESTATUS[0]}

    # Log the output (without config errors)
    cat "$RCLONE_OUTPUT" >> "$LOG"
    rm -f "$RCLONE_OUTPUT"

    if [ $RCLONE_EXIT -ne 0 ]; then
        echo "Rclone upload failed with exit code: $RCLONE_EXIT" >> "$LOG"
        update_status "DB_UPLOAD_FAILED"
        return
    fi
    
    echo "Rclone upload completed successfully" >> "$LOG"

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

    # Save hash for next comparison
    echo "$CURRENT_HASH" > "$LAST_BACKUP_HASH_FILE"

    echo "Calling update_status with DB_SUCCESS..." >> "$LOG"
    update_status "DB_SUCCESS"
    
    # Verify status file was written correctly
    if [ -f "$STATUS_FILE" ]; then
        echo "Status file written successfully:" >> "$LOG"
        cat "$STATUS_FILE" >> "$LOG"
    else
        echo "ERROR: Status file was not created!" >> "$LOG"
    fi

    echo "DB backup completed successfully at $(date)." >> "$LOG"
    echo "" >> "$LOG"
}

#########################################
# Function: Update Dashboard JSON
#########################################

update_status() {

    DB_STATUS=$1
    DB_LAST_RUN=$(date)

    echo "update_status called with: $DB_STATUS" >> "$LOG"

    # Preserve existing app backup fields if present
    if [ -f "$STATUS_FILE" ]; then
        EXISTING=$(cat "$STATUS_FILE")
    else
        EXISTING="{}"
    fi

    # Parse existing status to preserve webapp backup data
    WEBAPP_STATUS=$(echo "$EXISTING" | grep -o '"status": *"[^"]*"' | head -1 || echo '')
    WEBAPP_LAST_RUN=$(echo "$EXISTING" | grep -o '"last_run": *"[^"]*"' | head -1 || echo '')
    WEBAPP_DURATION=$(echo "$EXISTING" | grep -o '"duration_seconds": *[0-9]*' | head -1 || echo '')

    # Build JSON with both webapp and db status (proper JSON formatting without trailing commas)
    # Write to temp file first, then move to ensure atomic write
    TEMP_STATUS=$(mktemp)
    
    {
        echo "{"
        
        # Collect all fields in an array
        FIELDS=()
        
        if [ -n "$WEBAPP_STATUS" ]; then
            FIELDS+=("  $WEBAPP_STATUS")
        fi
        if [ -n "$WEBAPP_LAST_RUN" ]; then
            FIELDS+=("  $WEBAPP_LAST_RUN")
        fi
        if [ -n "$WEBAPP_DURATION" ]; then
            FIELDS+=("  $WEBAPP_DURATION")
        fi
        
        FIELDS+=("  \"db_status\": \"$DB_STATUS\"")
        FIELDS+=("  \"db_last_run\": \"$DB_LAST_RUN\"")
        
        # Output fields with proper comma separation
        for i in "${!FIELDS[@]}"; do
            if [ $i -lt $((${#FIELDS[@]} - 1)) ]; then
                echo "${FIELDS[$i]},"
            else
                echo "${FIELDS[$i]}"
            fi
        done
        
        echo "}"
    } > "$TEMP_STATUS"
    
    # Move temp file to status file (atomic operation)
    mv "$TEMP_STATUS" "$STATUS_FILE"
    
    echo "Status file updated successfully" >> "$LOG"
}

#########################################
# Watch Loop
#########################################

echo "Watching for database changes in $DB_DIR..." >> "$LOG"

while true
do
    # Watch only the main database file for modifications
    # Using -m for monitor mode (keeps running), -e for events
    inotifywait -m -e modify -e close_write --format '%f %e' "$DB_DIR" 2>&1 | while read FILE EVENTS
    do
        # Only process tasker.db (not journal, wal, shm files)
        if [[ "$FILE" == "tasker.db" ]]; then
            echo "Detected change in $FILE ($EVENTS), triggering backup check..." >> "$LOG"
            sleep 2  # Small delay to ensure write is complete
            perform_backup
        else
            echo "Ignoring change in $FILE (not main database file)" >> "$LOG"
        fi
    done
    
    # If inotifywait exits unexpectedly, restart it
    echo "inotifywait exited unexpectedly, restarting in 5 seconds..." >> "$LOG"
    sleep 5
done
