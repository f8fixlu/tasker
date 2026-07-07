# Security Audit Report — Tasker v2.0.0

## 🔴 CRITICAL

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Live credentials exposed in `.envbak`** | `backend/.envbak` | Contains real SMTP credentials (`askforhelptech@gmail.com` + Google App Password `[REDACTED]`), JWT signing secrets, and the admin email. This file is NOT in `.gitignore` and could be accidentally committed. **Immediate rotation required.** |
| 2 | **JWT secrets fallback to random on restart** | `backend/config/auth.js:4-5` | If `JWT_SECRET`/`JWT_REFRESH_SECRET` env vars aren't set (e.g., missing `.env`), `crypto.randomBytes(64)` generates new secrets on every server restart, invalidating ALL existing tokens and logging out every user. |
| 3 | **Heartbeat endpoint bypasses logout** | `backend/routes/auth.js:909-977` | The `/api/auth/heartbeat` endpoint can **create brand new sessions and refresh tokens** for users even after they've logged out, if the access token hasn't expired yet. This effectively nullifies session revocation on logout. |

## 🟠 HIGH

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 4 | **No rate limiting on auth endpoints** | All auth routes | Login, register, forgot-password have no brute-force protection. An attacker can make unlimited login attempts. |
| 5 | **No security headers** | `backend/server.js` | No `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, or `X-XSS-Protection` headers. `helmet` is only in the frontend deps. |
| 6 | **Tokens in localStorage** | `frontend/src/context/AuthContext.js` | JWT access & refresh tokens are stored in `localStorage`, making them accessible to any XSS attack. httpOnly cookies would be more secure. |
| 7 | **Admin by email list** | `backend/middleware/auth.js:136-148` | Anyone whose email is in `ADMIN_EMAILS` gets admin access on their next login, with no additional verification (no 2FA, no confirmation). |

## 🟡 MEDIUM

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 8 | **XSS via client-side regex sanitization** | `frontend/src/utils/sanitization.js` | Regex-based XSS filtering can be bypassed. Server-side validator escape is used but only after authentication for most routes. |
| 9 | **CORS wildcard fallback** | `backend/server.js:83` | CORS falls back to `*` when `origin` header is missing or doesn't match, though credentials are only sent for matching origins. |
| 10 | **Password reset token in URL** | `backend/routes/auth.js:706` | Reset tokens are sent as URL query parameters, exposing them in server logs, browser history, and referrer headers. |
| 11 | **Unnecessary stub npm packages** | `backend/package.json` | Deprecated stub packages `crypto@1.0.1`, `fs@0.0.1-security`, `path@0.12.7` could shadow Node.js built-ins and cause confusion. |
| 12 | **Sharp version mismatch** | root vs backend | `sharp@0.32.6` (backend) has known CVEs (e.g., CVE-2023-34091). Root uses `0.34.5`. |
| 13 | **Console logging of sensitive data** | Multiple files | Password first 5 chars logged (`auth.js:614`), token previews, IP addresses, and user agent strings are logged to console. |

## 🟢 LOW

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 14 | **Express 5 beta** | `frontend/server.js` | Express 5 is still in RC/beta stage and may have unpatched vulnerabilities. |
| 15 | **Temporary scripts present** | `backend/temp_admin_*.js` | Development/admin temp scripts left in production codebase. |
| 16 | **pdfmake XSS potential** | `frontend/package.json` | `pdfmake@0.3.7` has known XSS via PDF content injection. |
| 17 | **No CSP on file downloads** | `backend/routes/attachments.js` | Only `Content-Security-Policy: default-src 'none'` is set on downloads, but no CSP on API responses. |

---

## Recommendations (by priority)

### 🔴 Immediate

1. **Remove `.envbak` from the repo** and add it to `.gitignore`. Rotate ALL credentials immediately:
   - Revoke the Google App Password (`[REDACTED]`)
   - Rotate JWT secrets
2. **Fix heartbeat session creation** — heartbeat should never create new sessions. Remove the session-creation logic at `backend/routes/auth.js:909-977`.
3. **Add rate limiting** to auth endpoints using `express-rate-limit` (already in deps) or a custom middleware.

### 🟠 High Priority

4. **Add security headers** — install `helmet` on the backend or set headers manually: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Content-Security-Policy`.
5. **Migrate tokens to httpOnly cookies** instead of `localStorage` to mitigate XSS risks.
6. **Remove deprecated stub packages** (`crypto`, `fs`, `path` from npm — use Node.js built-ins instead).
7. **Apply input sanitization to unauthenticated routes too** (login, register, forgot-password). Currently sanitization is applied inconsistently.
8. **Implement account lockout** after N failed login attempts.

### 🟡 Medium Priority

9. **Update sharp** in the backend to match the root version (`0.34.5+`).
10. **Remove temp admin scripts** from the production codebase.
11. **Add CSRF protection** for cookie-based auth if migrating to cookies.
12. **Add email rate limiting** for forgot-password to prevent abuse.
13. **Sanitize console output** — avoid logging passwords, tokens, and IP addresses.
14. **Upgrade pdfmake** to latest version.

### 🟢 Lower Priority

15. **Add 2FA/MFA** support for admin accounts.
16. **Implement audit logging** for admin actions (user deletion, role changes).
17. **Regular dependency audits** — add `npm audit` to CI pipeline.
18. **Add a `CHANGELOG.md` / `SECURITY.md`** with vulnerability disclosure policy.
