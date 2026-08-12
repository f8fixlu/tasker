# Tasker Production Deployment on Proxmox

This guide deploys Tasker in production on Proxmox using an unprivileged **Debian 12 LXC container**,
exposed via **Cloudflare Tunnel** (no inbound ports needed), with full **rclone** backup services.

Architecture:

| Service          | Container port | Public URL                          |
| ---------------- | -------------- | ----------------------------------- |
| Frontend (React) | 3000           | `https://tasker.f8fixlu.biz`        |
| Backend API      | 5000           | `https://backend.f8fixlu.biz`       |
| DB (SQLite)      | n/a            | `/opt/tasker/backend/database/`     |
| Uploads          | n/a            | `/opt/tasker/backend/uploads/`      |

Prerequisites (already done in the repo, do once):

- Phase 0 — domains are read from env vars (`FRONTEND_URL`, `BACKEND_URL`, `REACT_APP_API_URL`).
  A future domain change only requires updating `backend/.env` + `frontend/.env.production`,
  rebuilding the frontend, and restarting the services.
- Code is published at `https://github.com/f8fixlu/tasker.git`.
- A Cloudflare account with the domain `f8fixlu.biz`, and a Google Drive remote ready for backups.

---

## Phase 1 — Create the LXC container (Proxmox host)

### 1.1 Download the Debian 12 template

Run on the Proxmox host:

```bash
pveam update
pveam available --section system
pveam download local debian-12-standard_12.7-1_amd64.tar.zst
```

Adjust the template filename to whatever `pveam available` lists (e.g. `12.7-1`, `12.9-1`).

### 1.2 Create the container

```bash
pct create 101 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname tasker \
  --storage local-lvm \
  --rootfs local-lvm:16 \
  --memory 2048 --swap 512 --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.5.210/24,gw=192.168.5.1 \
  --unprivileged 1 \
  --features nesting=0,fuse=0 \
  --start 1
```

Notes:

- Change the container ID (101), static IP (`192.168.5.210`) and gateway to match your LAN.
- `--unprivileged 1` is recommended for security (UID/GID mapping).
- Ports 3000/5000 are above 1024, so no privileged-container tricks are needed.
- Adjust disk/RAM if your Proxmox host differs.

### 1.3 Persistent data (survives container recreation)

Bind-mount two host directories so the SQLite database and uploads are NOT lost if the container
is rebuilt or deleted:

```bash
mkdir -p /mnt/tasker-db /mnt/tasker-uploads
pct set 101 -mp0 /mnt/tasker-db,mp=/opt/tasker/backend/database
pct set 101 -mp1 /mnt/tasker-uploads,mp=/opt/tasker/backend/uploads
pct reboot 101
```

### 1.4 Enter the container

```bash
pct enter 101
```

All remaining phases run inside the container unless noted otherwise.

---

## Phase 2 — Base packages (inside container)

```bash
apt update && apt upgrade -y

apt install -y git curl ca-certificates gnupg build-essential python3 \
  inotify-tools sqlite3 unzip rclone
```

- `build-essential` + `python3` are required to compile the native modules
  (`sqlite3`, `bcrypt`, `sharp`) during `npm install`.
- `inotify-tools` is required by the database watch backup service.
- `rclone` is used by the backup services.

### Install Node.js 20 LTS (NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v
```

---

## Phase 3 — Deploy the application to `/opt/tasker`

### 3.1 Create the app user and clone

```bash
useradd -r -m -s /bin/bash tasker
mkdir -p /opt/tasker
chown tasker:tasker /opt/tasker
```

As the `tasker` user:

```bash
sudo -u tasker git clone https://github.com/f8fixlu/tasker.git /opt/tasker
```

### 3.2 Backend

```bash
cd /opt/tasker/backend
npm install --omit=dev
```

Create `backend/.env` (copy from `.envbak`):

```bash
cp /opt/tasker/backend/.envbak /opt/tasker/backend/.env
nano /opt/tasker/backend/.env
```

Production values:

```env
NODE_ENV=production
PORT=5000
DB_NAME=tasker.db

# Generate strong secrets, e.g.:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<long random hex>
JWT_REFRESH_SECRET=<long random hex>

FRONTEND_URL=https://tasker.f8fixlu.biz
BACKEND_URL=https://backend.f8fixlu.biz

ADMIN_EMAILS=admin@f8fixlu.biz

MAX_FILE_SIZE=20971520
UPLOAD_DIR=/opt/tasker/backend/uploads

# SMTP (password reset emails) — optional in production but recommended
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=yourapppassword
SMTP_FROM="Tasker" <noreply@f8fixlu.biz>
```

> `.env` is git-ignored and contains secrets. Never commit it. The database
> file is created automatically at `backend/database/tasker.db` on first start.

### 3.3 Frontend

```bash
cd /opt/tasker/frontend
npm install
```

`frontend/.env.production` is committed and already contains:

```env
NODE_ENV=production
BACKEND_URL=https://backend.f8fixlu.biz
REACT_APP_API_URL=https://backend.f8fixlu.biz/api
GENERATE_SOURCEMAP=false
```

Build (the API URL is injected at build time from `.env.production`):

```bash
npm run build
```

---

## Phase 4 — Systemd services

The repo ships service files tuned for `/home/pi/apps/tasker` and user `pi`.
Adapt them for `/opt/tasker` and user `tasker`.

### 4.1 Backend service — `/etc/systemd/system/tasker-backend.service`

```ini
[Unit]
Description=Tasker Backend Server
After=network.target

[Service]
Type=simple
User=tasker
WorkingDirectory=/opt/tasker/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

### 4.2 Frontend service — `/etc/systemd/system/tasker-frontend.service`

```ini
[Unit]
Description=Tasker Frontend Server
After=network.target

[Service]
Type=simple
User=tasker
WorkingDirectory=/opt/tasker/frontend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=BACKEND_URL=https://backend.f8fixlu.biz
Environment=NODE_OPTIONS="--max-http-header-size=65536"

[Install]
WantedBy=multi-user.target
```

### 4.3 Start and verify

```bash
systemctl daemon-reload
systemctl enable --now tasker-backend tasker-frontend
systemctl status tasker-backend tasker-frontend

# Local smoke tests
curl -s http://localhost:5000/api/auth/login -o /dev/null -w "%{http_code}\n"
curl -s http://localhost:3000 -o /dev/null -w "%{http_code}\n"
```

Expected: backend returns `404` (JSON, server alive) or `400`; frontend returns `200`.
Both should come back with non-zero codes. Use `journalctl -u tasker-backend -f` to debug.

---

## Phase 5 — Cloudflare Tunnel

No firewall ports are opened; Cloudflare connects out to the container.

### 5.1 Install cloudflared

```bash
curl -L --output /tmp/cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i /tmp/cloudflared.deb
```

### 5.2 Authenticate and create the tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create tasker
cloudflared tunnel list
```

### 5.3 Tunnel config — `/etc/cloudflared/config.yml`

```yaml
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: tasker.f8fixlu.biz
    service: http://localhost:3000
  - hostname: backend.f8fixlu.biz
    service: http://localhost:5000
  - service: http_status:404
```

### 5.4 Run as a service

```bash
cloudflared --config /etc/cloudflared/config.yml service install
systemctl start cloudflared
systemctl enable cloudflared
systemctl status cloudflared
```

### 5.5 DNS records (Cloudflare dashboard)

Create two **CNAME** records, both proxied (orange cloud):

| Type  | Name               | Target                          |
| ----- | ------------------ | ------------------------------- |
| CNAME | `tasker`           | `<tunnel-id>.cfargotunnel.com`  |
| CNAME | `backend`          | `<tunnel-id>.cfargotunnel.com`  |

TLS certificates are managed automatically by Cloudflare.

---

## Phase 6 — Backups (rclone, full setup)

The repo provides two services:

- `tasker-backup` — nightly (02:00) webapp sync to Google Drive, 30-day versioning.
- `tasker-db-watch` — real-time DB snapshot on change (30 min debounce, 14-day versioning).

### 6.1 Configure rclone

```bash
sudo -u tasker rclone config
```

Create a remote named `gdrive_f8fixlu_crypt` (Google Drive remote wrapped in a
`crypt` remote for encryption). The script expects the folders `current` and
`versions` (and `db/current`, `db/versions`), which it creates automatically.

Verify the rclone.conf is readable by `tasker`:

```bash
ls -l /home/tasker/.config/rclone/rclone.conf
```

### 6.2 Adapt the scripts and service files

The scripts hardcode `/home/pi/apps/tasker`. Update in-place:

```bash
cd /opt/tasker/scripts
sed -i 's|/home/pi/apps/tasker|/opt/tasker|g' tasker_backup.sh tasker_db_watch.sh
sed -i 's|/home/pi/tasker_exclude.txt|/opt/tasker/tasker_exclude.txt|g' tasker_backup.sh
sed -i 's|/home/pi/.config/rclone/rclone.conf|/home/tasker/.config/rclone/rclone.conf|g' tasker_db_watch.sh
```

If your rclone remote is not `gdrive_f8fixlu_crypt`, update `REMOTE_CURRENT` and
`REMOTE_VERSIONS` in both scripts.

Create the runtime directories and the exclude file:

```bash
mkdir -p /opt/tasker/scripts/logs /opt/tasker/status
cat > /opt/tasker/tasker_exclude.txt <<'EOF'
node_modules/
.git/
*.log
scripts/logs/
status/
.env
EOF
chown -R tasker:tasker /opt/tasker/scripts /opt/tasker/status
```

### 6.3 Backup service — `/etc/systemd/system/tasker-backup.service`

```ini
[Unit]
Description=Tasker Webapp Backup Service
After=network.target

[Service]
Type=oneshot
User=tasker
Group=tasker
WorkingDirectory=/opt/tasker/scripts
Environment="RCLONE_CONFIG=/home/tasker/.config/rclone/rclone.conf"
ExecStart=/bin/bash /opt/tasker/scripts/tasker_backup.sh
StandardOutput=append:/opt/tasker/scripts/logs/tasker_backup.log
StandardError=append:/opt/tasker/scripts/logs/tasker_backup.log

OnCalendar=*-*-* 02:00:00
Persistent=true

Nice=19
IOSchedulingClass=best-effort
IOSchedulingPriority=7

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/opt/tasker/scripts/logs /opt/tasker/status /home/tasker/.config/rclone

[Install]
WantedBy=multi-user.target
```

### 6.4 DB watch service — `/etc/systemd/system/tasker-db-watch.service`

```ini
[Unit]
Description=Tasker Database Watch Backup Service
After=network.target tasker-backend.service
Wants=tasker-backend.service

[Service]
Type=simple
User=tasker
Group=tasker
WorkingDirectory=/opt/tasker/scripts
ExecStart=/bin/bash /opt/tasker/scripts/tasker_db_watch.sh
StandardOutput=append:/opt/tasker/scripts/logs/tasker_db_watch.log
StandardError=append:/opt/tasker/scripts/logs/tasker_db_watch.log
Restart=always
RestartSec=10

NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/opt/tasker/backend/database /opt/tasker/scripts/logs /opt/tasker/status /tmp

MemoryMax=256M
CPUQuota=25%

[Install]
WantedBy=multi-user.target
```

> **Important**: do NOT add `WatchdogSec` to this service. The repo's original file
> used `WatchdogSec=300` but the script never calls `sd_notify`, so systemd would
> kill the service every 5 minutes.

### 6.5 Enable backup services

```bash
systemctl daemon-reload
systemctl enable --now tasker-backup tasker-db-watch

# Test a manual webapp backup
systemctl start tasker-backup
cat /opt/tasker/status/tasker_backup_status.json
```

After creating/editing a task or event, the DB watch service should back up within
~30 minutes. Monitor with:

```bash
journalctl -u tasker-db-watch -f
tail -f /opt/tasker/scripts/logs/tasker_db_watch.log
```

---

## Phase 7 — Verification & day-2 operations

### 7.1 Full verification checklist

```bash
# Services
systemctl status tasker-backend tasker-frontend cloudflared tasker-backup tasker-db-watch

# Ports
ss -tlnp | grep -E ':3000|:5000'

# Local checks
curl -I http://localhost:3000
curl -s http://localhost:5000/api/database/status | head -c 300

# Backup status JSON
cat /opt/tasker/status/tasker_backup_status.json
```

In the browser (`https://tasker.f8fixlu.biz`):

- [ ] Login / register an account
- [ ] Create a task and an event
- [ ] Upload a file attachment (exercises `/uploads/` + secure storage)
- [ ] Generate a report and export to PDF
- [ ] Open the admin panel `/admin/backups` and confirm backup status shows SUCCESS

### 7.2 Updating the application

```bash
cd /opt/tasker
sudo -u tasker git pull
cd backend && sudo -u tasker npm install --omit=dev
cd ../frontend && sudo -u tasker npm install && sudo -u tasker npm run build
systemctl restart tasker-backend tasker-frontend
```

### 7.3 Changing the domain later

No code changes needed (Phase 0 already parametrized domains):

1. `backend/.env` → update `FRONTEND_URL` and `BACKEND_URL`.
2. `frontend/.env.production` → update `BACKEND_URL` and `REACT_APP_API_URL`.
3. Rebuild the frontend: `npm run build`.
4. Update `/etc/cloudflared/config.yml` hostnames and the DNS CNAME records.
5. Restart: `systemctl restart tasker-backend tasker-frontend cloudflared`.

### 7.4 Security notes

- Keep `JWT_SECRET` / `JWT_REFRESH_SECRET` strong and unique; rotate periodically.
- `.env` is git-ignored — never commit it. rclone.conf contains Google Drive tokens.
- No inbound ports are open (tunnel-only); keep `ufw`/firewall on the Proxmox host default.
- Backup the rclone config + remote credentials separately from the container.
- Test a backup restore at least monthly.

### 7.5 Troubleshooting

| Symptom                               | Check                                                        |
| ------------------------------------- | ------------------------------------------------------------ |
| Frontend 502 via tunnel               | `systemctl status tasker-frontend cloudflared`; `curl localhost:3000` |
| API calls fail (CORS)                 | Verify `FRONTEND_URL`/`BACKEND_URL` in `backend/.env` match your domains exactly |
| Backend fails to start (native module) | `npm install` as `tasker`; ensure `build-essential python3` installed; logs: `journalctl -u tasker-backend -f` |
| DB watcher not backing up             | `inotify-tools` installed; bind mount writable by `tasker`; check `scripts/logs/tasker_db_watch.log` |
| Domain not resolving                  | DNS CNAME proxied (orange cloud) pointing at `<tunnel-id>.cfargotunnel.com` |
