# Architecture and deployment boundary

## Current boundary

`portal/` is a static single-page demo. `app.js` uses a small local adapter backed by `localStorage`; this makes the portfolio link safe and deterministic. It does **not** claim multi-user persistence, document generation, or access to a real Drive account.

The route seam is intentionally small: `state`, `loadState`, and `saveState` are the only demo persistence calls used by the views. `portal/config.js` switches the UI to the PHP API adapter with `demoMode: false`; no database or Google credential is ever shipped to the browser.

The public demo login is intentionally synthetic. It is not a password database and must not be described as production authentication.

## Recommended low-cost production shape

```text
Browser (static portal)
        |
        | same-origin HTTPS JSON API
        v
Hostinger PHP API + MySQL
        |
        | server-side OAuth/service integration
        v
Private Google Drive folder / PDF generation worker
```

Hostinger is the system of record for users, projects, assets, and audit events. Drive is document storage, not the application database. This avoids making a spreadsheet or public Apps Script deployment the authorization boundary.

## Minimum API contract

- `POST /api/index.php?action=login` — authenticate and establish a secure session.
- `GET /api/index.php?action=session` — return the current authenticated user.
- `GET /api/index.php?action=warranties` — list records the current user may see.
- `POST /api/index.php?action=warranties` — validate and create a warranty.
- `GET /api/index.php?action=assets` — list custody state.
- `POST /api/index.php?action=transfers` — append an immutable transfer event.
- `GET /api/index.php?action=timeline` — return the joined audit trail.
- `POST /api/index.php?action=logout` — destroy the current session.
- `POST /api/index.php?action=request-password-reset` — start a generic recovery request without revealing whether an account exists.
- `GET /api/index.php?action=users` — list users for administrators and operations administrators.
- `POST /api/index.php?action=users` — create a user with a server-side password hash and role authorization.
- `GET /api/index.php?action=permissions` — read the role permission matrix.
- `PUT /api/index.php?action=permissions` — replace the matrix as an administrator, protected by CSRF.

The first implementation is in `api/index.php`. It uses PHP sessions with `HttpOnly`, `SameSite=Lax`, optional `Secure` cookies, PDO prepared statements, CSRF headers, password hashing verification, role checks, transactions, and generic server errors.

Every mutation must write an audit event with actor, action, record ID, timestamp, and request correlation ID. Do not accept an actor or role from the browser payload.

## Integration order

1. Create a new Hostinger database and user; do not reuse the credentials in the legacy files.
2. Import `api/schema.sql`, then add a dedicated `projects` table before expanding the warranty workflow beyond its current project-number field.
3. Implement the PHP API with PDO, server-side validation, CSRF, rate limiting, and authorization tests.
4. Add a private Google Apps Script/Drive integration or a server-side Google OAuth flow for PDF output.
5. Replace the local adapter only when the API has a staging environment and contract tests.
6. Keep `VITE_DEMO_MODE=true` for the public portfolio link and publish production separately.

## Account and access flows

The demo exposes three administration surfaces for portfolio review:

- **Password recovery:** uses a generic response so an email cannot be used to enumerate users. Demo mode simulates the request locally; production requires a private mail adapter to deliver the one-time token.
- **Users:** creates synthetic operators with a temporary password and a least-privilege role. The API stores only a `password_hash` and never returns credentials.
- **Permissions:** lets an administrator review and save the role matrix. In production, changes require an admin session and CSRF token; the public demo stores the matrix only in the browser.
