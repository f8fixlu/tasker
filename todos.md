# Tasker Single-Port Consolidation Plan

## Goal
Merge frontend (port 3000) and backend (port 5000) into a single Express server running on a single port, eliminating the need for `backend.f8fixlu.cc` subdomain and complex CORS setup.

## Steps

### Phase 1: Backend Conversion to Express
- [ ] Install `express` dependency in `backend/`
- [ ] Rewrite `backend/server.js` from raw `http.createServer` to Express:
  - Replace manual if/else routing with `app.use('/api/auth', authRoutes)` etc.
  - Preserve all existing middleware (CORS, auth, sanitization)
  - Keep all background jobs (session cleanup, notifications, status services)

### Phase 2: Add Static File Serving to Backend
- [ ] Serve `../frontend/build/` as static files with caching headers (copy logic from `frontend/server.js`)
- [ ] Add SPA fallback: non-API, non-file routes return `index.html` for React router
- [ ] Keep `/uploads/` file serving from existing `handleStaticFile` function

### Phase 3: Frontend Build Configuration
- [ ] Update `frontend/.env.production`:
  ```
  REACT_APP_API_URL=/api
  ```
- [ ] Rebuild the frontend: `cd frontend && npm run build`

### Phase 4: CORS & Security Cleanup
- [ ] Remove CORS from merged server (same-origin requests no longer need it) or keep only for dev
- [ ] Update `helmet` CSP `connectSrc` to allow same-origin API calls
- [ ] Remove references to `backend.f8fixlu.cc` in `frontend/server.js` (will be retired)

### Phase 5: Port & Script Updates
- [ ] Change merged server port to 443 (or keep a preferred port)
- [ ] Update `start-tasker.sh` to launch single server instead of two
- [ ] Update root `package.json` scripts (`start`, `dev`, etc.)

### Phase 6: Cloudflare Tunnel Config
- [ ] Update cloudflared config.yml:
  ```yaml
  tunnel: f8fixlu
  ingress:
    - hostname: tasker.f8fixlu.cc
      service: http://localhost:{NEW_PORT}
    - service: http_status:404
  ```
- [ ] Remove `backend.f8fixlu.cc` DNS record from Cloudflare if no longer needed

### Phase 7: Verification
- [ ] Test API endpoints via `/api/*` paths
- [ ] Test React SPA routing (all pages render correctly)
- [ ] Test file uploads via attachments
- [ ] Verify background jobs still run
- [ ] Check logs for any errors
