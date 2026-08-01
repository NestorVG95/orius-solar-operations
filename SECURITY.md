# Security notes

## Critical: rotate historical secrets

The legacy folder contains a database username/password in `MYSQL/Cuenta.txt` and several public Google Apps Script, Cloudflare Worker, Drive, and Forms URLs in HTML/JS/TXT files. These values are treated as compromised because they are stored in plaintext in the working directory.

Before publishing the repository:

1. Revoke the old database account and all Apps Script/Worker deployments.
2. Rotate the hosting, Drive, and Google account credentials.
3. Remove the historical secrets from the public Git history if the folder is ever committed.
4. Use a new least-privilege database user and a private Drive folder.

This new `portal/` app intentionally contains no provider endpoint and uses synthetic local data.

The static demo ships a restrictive CSP in `portal/index.html` and matching Apache headers in `portal/.htaccess`. GitHub Pages will not apply `.htaccess`; enable equivalent headers at the CDN/hosting layer when using another deployment.

The optional API in `api/index.php` is the production boundary: it uses server-side sessions, CSRF tokens for mutations, PDO prepared statements, `password_verify`, role authorization, a database-backed login rate limit, transaction-wrapped mutations, and generic error responses. Configure it with a server-only `api/config.php`; the example file is safe to commit, but the real file is ignored by Git.

## Production controls

- Put Google Drive and Hostinger credentials on the server only; never in client JavaScript.
- Use an allowlist for CORS, HTTPS-only cookies, `HttpOnly`, `Secure`, and `SameSite=Lax` or stricter.
- Require authentication and role authorization for create, update, transfer, and document-download actions.
- Keep password-recovery responses generic, rate-limit reset requests, expire one-time tokens, and deliver them only through a private mail adapter.
- Store role permissions server-side and protect policy changes with admin authorization plus CSRF.
- Validate all fields server-side with length, type, and allowlist checks. Client validation is only UX.
- Use PDO prepared statements and database constraints; never concatenate SQL.
- Add CSRF protection to cookie-authenticated mutations and rate-limit login and document-generation endpoints.
- Store generated documents outside the public web root, return short-lived signed download URLs, and log access without sensitive payloads.
- Add security headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and clickjacking protection.
- Back up the database and Drive output folder, test restoration, and document retention/deletion rules.
