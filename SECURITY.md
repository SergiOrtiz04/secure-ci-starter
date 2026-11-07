# Security Policy

<!--
  Template. Replace the placeholders in <angle brackets> before publishing.
  GitHub surfaces this file under the repo's "Security" tab automatically.
-->

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main`  | Yes       |
| older   | No        |

Only the `main` branch receives security fixes. If you deploy a fork, keep it
in sync.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through one of these channels:

1. **GitHub private vulnerability reporting** (preferred):
   _Security_ tab → _Report a vulnerability_. This creates a private advisory
   that only maintainers can see.
2. **Email:** `<security@your-domain.example>`
   If you want to encrypt, our PGP key fingerprint is `<FINGERPRINT>`.

Include, where possible:

- a description of the issue and its impact,
- steps to reproduce or a proof-of-concept,
- the affected version / commit,
- whether you want to be credited (and under what name).

## What to expect

| Step                        | Target time        |
| --------------------------- | ------------------ |
| Acknowledgement of report   | within 3 business days |
| Initial assessment/severity | within 7 days      |
| Fix for high/critical       | within 30 days     |
| Fix for medium/low          | next scheduled release |

We will keep you informed of progress and let you know when the fix ships.
We ask that you give us reasonable time to fix the issue before any public
disclosure (coordinated disclosure, 90 days by default).

## Scope

In scope:

- this repository's source code and configuration,
- the GitHub Actions workflows under `.github/workflows/`.

Out of scope:

- vulnerabilities in third-party dependencies that are already public
  (please report them upstream; Dependabot will pick up the fix),
- denial-of-service via volumetric traffic,
- findings from automated scanners without a demonstrated impact.

## Safe harbour

We will not pursue legal action against researchers who act in good faith:
test only against their own deployments, avoid privacy violations and
service disruption, and give us time to respond before disclosure.

## Automated defences already in place

This project runs the following checks on every pull request and weekly on a
schedule (see `.github/workflows/security.yml`):

- `npm audit` for known-vulnerable dependencies
- gitleaks secret scanning over the full git history
- Semgrep SAST (`p/ci`, `p/nodejs`, `p/owasp-top-ten`)
- GitHub dependency review on pull requests
- CodeQL semantic analysis
