#!/bin/bash

#########################################
# TASKER PRODUCTION DEPLOYMENT SCRIPT
# -------------------------------------
# Performs an initial production deployment:
#   1. Checks required dependencies (node, npm, git, sudo)
#   2. Creates the 'tasker' system user and sets ownership
#   3. Installs npm dependencies (root, backend, frontend)
#   4. Builds the frontend using `npm run build:prod`
#   5. Installs systemd service files
#   6. Enables and starts the services
#
# Intended install location: /opt/tasker
# Service user:              tasker
#
# Usage:
#   ./scripts/deploy.sh
#
# sudo is used ONLY for user/systemd operations. npm/git run as
# the invoking user.
#########################################

set -euo pipefail

# === CONFIGURATION ===
BACKEND_SERVICES=("tasker-backend.service" "tasker-frontend.service")
# Additional services installed if present in the project root
OPTIONAL_SERVICES=("tasker-backup.service" "tasker-db-watch.service")
# === CONFIGURATION ===

# Colored output helpers
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
yellow "================================================"
yellow "  TASKER PRODUCTION DEPLOYMENT"
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
    echo "  Node.js:  https://nodejs.org (v18 or higher recommended)"
    echo "  Git:      e.g. apt install git"
    exit 1
fi

NODE_VERSION="$(node -v)"
NPM_VERSION="$(npm -v)"
echo ""
echo "  Detected: node $NODE_VERSION, npm $NPM_VERSION"
echo ""

#########################################
# 2. Verify project structure
#########################################
if [ ! -f "$PROJECT_ROOT/backend/package.json" ]; then
    red "Project root not detected. Ensure deploy.sh is inside the 'scripts/' folder of the repo."
    exit 1
fi

echo "Project root: $PROJECT_ROOT"
echo ""

#########################################
# 2b. Service user & permissions
# Runs as a dedicated 'tasker' system user.
#########################################
SERVICE_USER="tasker"

need_sudo() {
    if [ "$(id -u)" -ne 0 ]; then
        sudo "$@"
    else
        "$@"
    fi
}

echo "--- Setting up service user ($SERVICE_USER) ---"
if id "$SERVICE_USER" >/dev/null 2>&1; then
    green "  user $SERVICE_USER already exists"
else
    need_sudo useradd --system --home "$PROJECT_ROOT" --shell /bin/bash "$SERVICE_USER"
    green "  created system user $SERVICE_USER"
fi

echo "  setting ownership of $PROJECT_ROOT to $SERVICE_USER:$SERVICE_USER"
need_sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$PROJECT_ROOT"
echo ""

#########################################
# 3. Install npm dependencies
#########################################
run_npm_install() {
    local dir="$1"
    local label="$2"
    echo "--- Installing dependencies ($label) ---"
    (cd "$dir" && npm install)
    echo ""
}

run_npm_install "$PROJECT_ROOT"            "root"
run_npm_install "$PROJECT_ROOT/backend"    "backend"
run_npm_install "$PROJECT_ROOT/frontend"   "frontend"

#########################################
# 4. Build frontend for production
#########################################
echo "--- Building frontend (npm run build:prod) ---"
(cd "$PROJECT_ROOT/frontend" && npm run build:prod)
echo ""
green "Frontend build completed."
echo ""

#########################################
# 5. Install systemd service files
#########################################
echo "--- Installing systemd service files ---"
for svc in "${BACKEND_SERVICES[@]}" "${OPTIONAL_SERVICES[@]}"; do
    if [ -f "$PROJECT_ROOT/$svc" ]; then
        need_sudo cp "$PROJECT_ROOT/$svc" /etc/systemd/system/
        green "  installed $svc"
    fi
done

need_sudo systemctl daemon-reload
echo ""

#########################################
# 6. Enable and start services
#########################################
echo "--- Enabling and starting services ---"
for svc in "${BACKEND_SERVICES[@]}"; do
    need_sudo systemctl enable --now "${svc%.service}"
    echo ""
done

#########################################
# 7. Verify status
#########################################
echo "--- Service status ---"
ALL_OK=1
for svc in "${BACKEND_SERVICES[@]}"; do
    name="${svc%.service}"
    if need_sudo systemctl is-active --quiet "$name"; then
        green "  [ACTIVE] $name"
    else
        red "  [INACTIVE] $name"
        ALL_OK=0
    fi
done

echo ""
if [ "$ALL_OK" -eq 1 ]; then
    green "================================================"
    green "  DEPLOYMENT COMPLETE - ALL SERVICES ACTIVE"
    green "================================================"
else
    red "================================================"
    red "  DEPLOYMENT FINISHED WITH ISSUES - CHECK LOGS"
    red "================================================"
    echo "  View logs: sudo journalctl -u tasker-backend -f"
    exit 1
fi
