# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.2.x   | Yes       |
| < 1.2   | No        |

Only the latest release receives security fixes.

## Reporting a Vulnerability

Do not open a public issue for a security problem.

Use GitHub private vulnerability reporting: open the repository **Security** tab and choose **Report a vulnerability**. Include:

- affected version and platform (Windows or Android)
- steps to reproduce
- impact and any proof-of-concept details
- whether the issue also affects data at rest

You will get an acknowledgement within 7 days. Please give us time to ship a fix before any public disclosure.

## Security Model

- Notes are stored locally in IndexedDB. Nothing is uploaded by the app.
- Locked notes are encrypted at rest with AES-256-GCM. The key is derived from the password with PBKDF2-SHA256 (600 000 iterations) and kept in memory only for the unlocked session.
- Note passwords are stored as PBKDF2 hashes (210 000 iterations, per-note salt).
- Update installers are downloaded from the official GitHub release and must match the published SHA-256 digest before installation.
- Release builds require a private Android keystore supplied through repository secrets; the workflow fails without it.
- File writes are atomic and size-limited; sensitive OS paths (`~/.ssh`, `~/.aws`, key files, credential stores) are rejected by the Rust layer, including directory listings.
