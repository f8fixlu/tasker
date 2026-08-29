#!/bin/bash

#########################################
# TASKER UPDATE SCRIPT
# -------------------------------------
# Updates an existing production deployment:
#   1. Checks required dependencies (node, npm, git, sudo)
#   2. Ensures the 'tasker' service user and correct ownership
#   3. Pulls the latest code (git pull)
#   4. Installs npm dependencies (backend, frontend)
#   5. Stops services, builds frontend (npm run build:prod)
#   6. Restarts services and verifies status
#
# Intended install location: /opt/tasker
# Service user:              tasker
#
# Usage:
#   ./scripts/update.sh [branch]
#
#   branch  Optional git branch/ref to pull (default: main)
#
# sudo is used ONLY for systemd operations. npm/git run as
# the invoking user.
#########################################

set -euo pipefail

# === CONFIGURATION ===
BACKEND_SERVICES=("tasker-backend" "tasker-frontend")
DEFAULT_BRANCH="main"
# === CONFIGURATION ===

BRANCH="${1:-$DEFAULT_BRANCH}"

# Colored output helpers
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
yellow "================================================"
yellow "  TASKER UPDATE (branch: $BRANCH)"
yellow "================================================"
echo ""

#########################################
# 1. Dependency check
#########################################
check_command() {
    local cmd="$1"
    if command -v "$cmd" >/dev/null 2>&1; then
        green "  [OK] $cmd -> $(command -v "$cmd")"
        return 0
    else
        red "  [MISSING] $cmd is required but not installed."
        return 1
    fi
}

echo "--- Checking dependencies ---"
MISSING=0
check_command node  || MISSING=1
check_command npm   || MISSING=1
check_command git   || MISSING=1
check_command sudo  || MISSING=1

if [ "$MISSING" -ne 0 ]; then
    echo ""
    red "Missing required dependencies. Please install them and re-run."
    exit 1
fi

echo ""
echo "  Detected: node $(node -v), npm $(npm -v)"
echo ""

#########################################
# 2. Verify project structure + git repo
#########################################
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    red "Not a git repository. aborting update."
    exit 1
fi

need_sudo() {
    if [ "$(id -u)" -ne 0 ]; then
        sudo "$@"
    else
        "$@"
    fi
}

#########################################
# 2b. Ensure service user & ownership
#########################################
SERVICE_USER="tasker"

echo "--- Ensuring service user ($SERVICE_USER) ---"
if id "$SERVICE_USER" >/dev/null 2>&1; then
    green "  user $SERVICE_USER exists"
else
    need_sudo useradd --system --home "$PROJECT_ROOT" --shell /bin/bash "$SERVICE_USER"
    green "  created system user $SERVICE_USER"
fi

need_sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$PROJECT_ROOT"
echo ""

#########################################
# 3. Record current commit for rollback
#########################################
CURRENT_COMMIT="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
echo "Current commit: $CURRENT_COMMIT"
echo ""

#########################################
# 4. Pull latest code
#########################################
echo "--- Pulling latest code ---"
git -C "$PROJECT_ROOT" fetch origin
git -C "$PROJECT_ROOT" checkout "$BRANCH"
git -C "$PROJECT_ROOT" pull origin "$BRANCH"

NEW_COMMIT="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
echo ""
echo "Updated: $CURRENT_COMMIT -> $NEW_COMMIT"
echo ""

#########################################
# 5. Install npm dependencies
#########################################
echo "--- Installing dependencies (backend) ---"
(cd "$PROJECT_ROOT/backend" && npm install)
echo ""

echo "--- Installing dependencies (frontend) ---"
(cd "$PROJECT_ROOT/frontend" && npm install)
echo ""

#########################################
# 6. Stop services, build frontend
#########################################
echo "--- Stopping services for clean build ---"
for svc in "${BACKEND_SERVICES[@]}"; do
    if need_sudo systemctl is-active --quiet "$svc"; then
        need_sudo systemctl stop "$svc"
        yellow "  stopped $svc"
    else
        yellow "  $svc already stopped"
    fi
done
echo ""

echo "--- Building frontend (npm run build:prod) ---"
(cd "$PROJECT_ROOT/frontend" && npm run build:prod)
echo ""
green "Frontend build completed."
echo ""
echo "--- Restarting services ---"
for svc in "${BACKEND_SERVICES[@]}"; do
    need_sudo systemctl start "$svc"
    green "  started $svc"
done
echo ""

#########################################
# 7. Verify status
#########################################
echo "--- Service status ---"
ALL_OK=1
for svc in "${BACKEND_SERVICES[@]}"; do
    if need_sudo systemctl is-active --quiet "$svc"; then
        green "  [ACTIVE] $svc"
    else
        red "  [INACTIVE] $svc"
        ALL_OK=0
    fi
done

echo ""
if [ "$ALL_OK" -eq 1 ]; then
    green "================================================"
    green "  UPDATE COMPLETE - ALL SERVICES ACTIVE"
    green "  Commit: $NEW_COMMIT"
    green "================================================"
else
    red "================================================"
    red "  UPDATE FINISHED WITH ISSUES"
    red "================================================"
    echo "  View logs: sudo journalctl -u tasker-backend -f"
    echo ""
    yellow "  Rollback to previous commit:"
    echo "    git -C $PROJECT_ROOT reset --hard $CURRENT_COMMIT"
    echo "    $0"
    exit 1
fi
