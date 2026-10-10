# FoodRescue

FoodRescue connects food providers with verified recipient organizations and collectors so safe surplus food can be collected instead of wasted. This repository currently contains **Phase 2 (foundation)** and the initial **Phase 3 (authentication and organization verification)** implementation. It is not the complete platform described in the full specification yet.

## Implemented in this foundation

- React + TypeScript + Vite frontend with responsive editorial-style landing page and login/register flows.
- Express + TypeScript backend under `/api/v1`.
- MongoDB/Mongoose connection with a truthful health endpoint; no in-memory fallback or seeded data.
- User, Organization, and AuditEvent schemas with indexes.
- Email/password registration for Food Provider, Recipient Organization, or Collector; admin role cannot be selected publicly.
- Password hashing, HTTP-only session cookie stored in MongoDB, login/logout/current-user routes, login rate limiting, validation, Helmet, CORS allowlist, and same-origin checks for state-changing requests.
- Email verification and password reset token flows using single-use, expiring hashed tokens. SMTP must be configured for messages to actually be sent.
- Password change and admin-only organization approval/rejection/suspension routes.
- CLI bootstrap for the first administrator.
- Unit tests for password/token utilities and registration validation.

## Requirements

- Node.js 20+ (tested here with Node 22 where available)
- npm 10+
- MongoDB Atlas M0 or local MongoDB
- SMTP credentials for email verification and password recovery (optional for local UI work, required for actual email delivery)

## Setup on Windows

1. Extract the ZIP into `C:\Users\user\foodrescue` or another project directory. Preserve your existing files by extracting to a new folder first if you already have work there.
2. Copy `.env.example` to `backend/.env` (or configure variables in your shell) and fill in MongoDB and session values. **Never commit `.env`.** The backend loads `backend/.env`.
3. From the project root run `npm install`.
4. Start the backend: `npm run dev --workspace backend`
5. In a second terminal start the frontend: `npm run dev --workspace frontend`
6. Open `http://localhost:5174`. Backend health: `http://localhost:4000/api/v1/health`.

If MongoDB is not configured, the API returns a service-unavailable response and the health endpoint reports database status as disconnected. It does not switch to fake data.

## Bootstrap the first administrator

After setting `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `backend/.env`, run:

```bash
npm run admin:bootstrap --workspace backend
```

This command creates the admin only if the email is not already registered. The password must be at least 12 characters. Do not use the example values in a public environment.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

The `docs/IMPLEMENTATION_STATUS.md` file records what was and was not verified in the environment used to create this archive. Package installation timed out in the sandbox, so dependency-based builds and tests still need to run after `npm install` succeeds on your machine. External MongoDB/SMTP integration cannot be verified without your credentials.

## Security notes

- Sessions are stored in MongoDB and cookies are HTTP-only, SameSite=Lax, and Secure in production. Use HTTPS for deployment.
- State-changing routes validate the request origin. Configure `FRONTEND_ORIGIN` exactly.
- Verification/reset tokens are random, hashed in the database, expire, and are cleared after use.
- Password reset responses do not reveal whether an email exists.
- This is a development foundation, not a security certification or production-ready/legal-compliance claim. Add monitoring, backup/retention policies, security review, CSRF review for the final deployment topology, and dependency audits before public launch.

## Not implemented yet

Donation CRUD/lifecycle, partial claims and concurrency controls, matching engine, collector assignments and one-time pickup/delivery codes, maps/live GPS, Socket.IO notifications, impact analytics, incident reporting, remaining dashboards and public/legal pages, file uploads, and end-to-end tests against a real MongoDB instance are pending. See `docs/IMPLEMENTATION_STATUS.md`.
