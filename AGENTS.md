# AGENTS.md

Tasker is a task/event manager: two independent Node apps (`backend/`, `frontend/`) plus a thin root orchestrator. `README.md` has a useful directory tree, but its **API endpoint list is stale** — trust `backend/server.js` for real paths (see Architecture).

## Architecture
- `backend/` is API-only and uses **no Express**: `backend/server.js` is a hand-rolled `node:http` server. All routing is manual `if/else` string matching in `server.js` (~lines 147-237). Register new endpoints there, and keep **specific paths before generic ones**. Files in `backend/routes/` only handle an already-matched request. (The root README's "Express.js" claim is inaccurate; only `frontend/server.js` uses Express.)
  - Nested prefixes (README's flat names are wrong): `/api/tasks/categories`, `/api/tasks/types`, `/api/tasks/subtypes`, `/api/events/categories`, `/api/events/types`. The README's `/api/categories`, `/api/task-types`, `/api/sub-types`, `/api/event-categories`, `/api/event-types` **do not exist**.
- Data layer: `backend/models/` holds SQL access; `backend/config/database.js` creates/alters tables inline at startup. There is no migration runner (`database/migrations` is not invoked).
- `frontend/` is CRA (React 18) run through `react-app-rewired`. `config-overrides.js` disables ESLint and adds splitChunks for prod builds. Axios client lives in `src/services/api.js`.
- Backend only serves `/api/*` and `/uploads/*`; it 404s everything else (frontend is served separately).

## Commands
- `npm run install:all` — install root + backend + frontend
- `npm run dev` — backend (`:5000`, `node --watch`) and frontend (`:3000`) via concurrently
- `cd backend && npm test` — Jest; single file: `npx jest tests/unit/models/User.test.js`
- `cd frontend && npm run build` uses `frontend/.env` (gitignored, `http://localhost:5000/api`); `npm run build:prod` sets `NODE_ENV=production`, so CRA loads the **tracked** `frontend/.env.production`, which hardcodes `REACT_APP_API_URL=https://backend.f8fixlu.cc/api`.

## Config / runtime gotchas
- The backend loads env from the **repo-root `.env` first** (`backend/server.js:6`), falling back to a cwd `.env`. The README's `backend/.env` advice is misleading — put secrets in the root `.env` (gitignored). `backend/.envbak` is a local template with real-looking credentials (now untracked and gitignored by `.gitignore:17`); never commit secrets.
- The DB path is **hardcoded** to `backend/database/tasker.db` (`backend/config/database.js:5`). `DB_NAME` is unused; the repo-root `tasker.db` is not the live DB.
- Uploads go to `process.cwd()/uploads` (`backend/utils/secureFileStorage.js:8`), so start the backend with cwd = `backend/` (all npm scripts do). `backend`'s `dev:root` script (`cd .. && node backend/server.js`) instead runs with cwd = the repo root and changes that path.

## Testing
- `cd backend && npm test` is **red on a clean checkout**: `tests/integration/auth.test.js` requires a missing `backend/test-server.js`, and `tests/unit/models/Task.test.js` asserts an outdated status-validation message. Unit tests otherwise pass by mocking `backend/utils/database.js`.
- The frontend has **no test files**; `npm test` there only starts CRA watch, so root `npm test` hangs/fails. Run backend tests directly.

## Deployment
- Target `/opt/tasker`, service user `tasker`, systemd units in the repo root (`tasker-*.service`). `scripts/deploy.sh` is the first install; `scripts/update.sh [branch]` does `git pull` + build + restart. Frontend is built with `build:prod`.
- `frontend/server.js` (run by `tasker-frontend.service`) requires `express`, `helmet`, `compression`, `morgan`, `express-rate-limit`, and `cors`, but **none are declared in `frontend/package.json`**, so a fresh `npm install` leaves them missing — that server won't start on a clean install.
- Formatting: Prettier (single quotes, semicolons, 80 cols). No `lint` script; CRA's ESLint is stripped from prod builds.
