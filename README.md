# secure-ci-starter

**Ship with a security baseline in one afternoon.**

A minimal Node.js 20+ / TypeScript / Express API wired to a complete GitHub
Actions security pipeline: dependency audit, secret scanning, SAST, dependency
review and CodeQL. Fork it to start a new service with the checks already on,
or copy the `.github/` folder into an existing repo.


[![CI](https://github.com/SergiOrtiz04/secure-ci-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/SergiOrtiz04/secure-ci-starter/actions/workflows/ci.yml)
[![Security](https://github.com/SergiOrtiz04/secure-ci-starter/actions/workflows/security.yml/badge.svg)](https://github.com/SergiOrtiz04/secure-ci-starter/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.19-brightgreen.svg)](package.json)

> Built by [Sergio Ortiz](#hire-me), full-stack developer and information
> security master's student, as a working example of the service
> **"Add security scanning to your CI/CD"**. [Spanish version](README.es.md).

## Why this exists

Most early-stage teams have CI that runs tests and nothing else. The security
tooling is free, open source and takes an afternoon to wire up, but that
afternoon never comes. This repo is that afternoon, done once, with every
decision commented so your team can own it afterwards.

## What the pipeline catches

All five jobs live in [`.github/workflows/security.yml`](.github/workflows/security.yml),
run on every push and pull request to `main`, and again **every Monday** on a
schedule (new CVEs are published against old code every day).

| Job                   | Tool                                                                                     | Question it answers                                                     | Blocks the PR when                                         |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| **dependency-audit**  | `npm audit --audit-level=high` + `npm outdated` summary                                  | Do my installed packages have known vulnerabilities?                    | Any high/critical advisory in the lockfile                 |
| **secret-scan**       | [gitleaks](https://github.com/gitleaks/gitleaks) (full git history)                      | Did anyone commit an API key, token, password or private key, ever?    | Any match in any commit                                    |
| **sast**              | [Semgrep](https://semgrep.dev) with `p/ci`, `p/nodejs`, `p/owasp-top-ten`                 | Does the code contain insecure patterns (eval, injection, path traversal, missing rate limit, ...)? | Any finding; results also appear inline in the PR diff via SARIF |
| **dependency-review** | [`actions/dependency-review-action`](https://github.com/actions/dependency-review-action) | Does **this PR** add a vulnerable or badly-licensed package?             | New dependency with severity >= high or a denied licence   |
| **codeql** (optional) | [CodeQL](https://codeql.github.com) `javascript-typescript`, `security-extended`         | Can a cross-file dataflow analysis find taint bugs the pattern tools miss? | Any alert; free on public repos, needs GHAS on private ones |

Supporting files:

| File                                | Purpose                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `.github/workflows/ci.yml`          | Lint (ESLint flat config, type-aware), typecheck, Vitest, build, smoke test on Node 20 and 22 |
| `.github/dependabot.yml`            | Weekly grouped update PRs for npm packages **and** GitHub Actions       |
| `.github/PULL_REQUEST_TEMPLATE.md`  | Security checklist every PR author ticks through                        |
| `.gitleaks.toml`                    | Default rules + a minimal allowlist (lockfiles, `.env.example`)         |
| `.semgrepignore`                    | Keeps build output and tests out of SAST                                |
| `SECURITY.md`                       | Responsible-disclosure policy template (shows up in GitHub's Security tab) |
| `scripts/local-scan.sh`             | Same checks locally: `npm run scan`                                     |
| `docs/findings-example.md`          | What the report to a client looks like                                  |

Pipeline hygiene baked in: top-level `permissions: contents: read` with
per-job widening only where needed, actions pinned by version tag (switch to
SHA pins for stricter supply-chain control), `concurrency` groups that cancel
superseded runs, and `npm ci` (never `npm install`) so CI tests exactly what the
lockfile says.

## The sample API

Small on purpose, but every line that touches a request is a defensive one:

| Endpoint        | What it shows                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `GET /health`   | Liveness probe; leaks nothing about versions or hosts                                          |
| `GET /users`    | Bounded pagination (`limit` capped at 100), explicit public-field mapping so password hashes can't leak |
| `POST /login`   | Strict zod schema (unknown keys rejected, password length capped against hashing DoS), scrypt + constant-time compare, identical error for unknown email vs wrong password, **5 attempts / 15 min / IP** rate limit |

Plus `helmet` headers, a global 100 req / 15 min limiter, 10 KB JSON body
limit, JSON-only 404s, and an error handler that never returns stack traces.
Fourteen Vitest + supertest tests pin all of that behaviour, including the
rate-limit `429`.

Demo credentials (documented, not secret): any seeded email
(`ada@example.com`, `grace@example.com`, `linus@example.com`) with password
`correct horse battery staple`.

## 60-second quickstart

1. **Fork** this repository (or click *Use this template*).
2. Go to the **Actions** tab and click **Enable workflows** (GitHub disables
   them on forks by default).
3. Open a pull request — change anything, even this README. Watch the
   `CI` and `Security` checks appear on the PR.

To see a red check on purpose, paste a fake token in a real format into a
source file on your PR branch, for example a GitHub token: `ghp_` followed by
36 random letters and digits. gitleaks fails the secret-scan job and points at
the exact line and commit. (The well-known AWS sample key ending in `EXAMPLE`
is allowlisted by gitleaks, so that one will not trigger.)

Run it locally:

```bash
npm ci
npm run dev          # http://localhost:3000/health
npm test             # vitest + supertest
npm run lint && npm run typecheck && npm run build
npm run scan         # npm audit + gitleaks + semgrep (uses docker if binaries are missing)
```

Requires Node >= 20.19. Set `PORT` in `.env` (see `.env.example`).

## What I deliver for clients

Fixed-price, fixed-scope packages for teams on GitHub (GitLab CI on request).
Prices in USD; typical turnaround in parentheses.

| Package | Price     | What you get                                                                                                                                                                       |
| ------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Baseline**     | **$200** (2 days)  | This pipeline adapted to one repo: audit, secret scan, SAST, dependency review, Dependabot, PR checklist, `SECURITY.md`. First-run findings triaged and explained.          |
| **B — Baseline + fixes** | **$350** (3–4 days) | Everything in A, plus I fix the findings from the first run (rotate leaked secrets with you, bump vulnerable packages, add missing input validation / rate limiting), with tests. Written report like [`docs/findings-example.md`](docs/findings-example.md). |
| **C — Multi-repo / monorepo** | **$500** (5 days) | A or B across up to three services or a monorepo, shared reusable workflow, branch protection rules, CodeQL enabled, a 30-minute hand-off call with your team.          |

Every package includes: all config committed to your repo with comments (no
lock-in, no SaaS dependency), one week of follow-up questions, and a short
Loom walkthrough of what was set up.

Not included: penetration testing, cloud/infra review, compliance paperwork.
See the next section for why.

## Tradeoffs and limits

Being clear about what this is *not* is part of being trustworthy:

- **SAST is not a pentest.** Semgrep and CodeQL find patterns and taint
  flows; they do not find "user A can read user B's invoice" or flawed
  business logic. Pair the pipeline with a manual authorisation review when
  you handle money or personal data.
- **Scanners know what is public.** `npm audit` and dependency review rely on
  advisory databases. A zero-day in your dependency is invisible until it's
  disclosed, which is why the weekly schedule matters.
- **Secret scanning finds shapes, not intent.** gitleaks matches known
  formats and high entropy. A password that is just `hunter2` passes. Keep
  secrets out of code by convention (`.env`, CI secrets), not just by scanning.
- **False positives exist.** Expect to tune `.semgrepignore` and
  `.gitleaks.toml` during the first week. Over-tuning is the real risk;
  every exclusion is a blind spot.
- **CodeQL on private repos costs money** (GitHub Advanced Security). The job
  is clearly marked optional and fails loudly, not silently, if GHAS is absent.
- **`fail-on-severity: high`** is a starting point, not a verdict. Tighten to
  `moderate` once the backlog is empty.
- **Runtime protection is out of scope.** This covers the build; WAFs, runtime
  monitoring and infrastructure hardening are different work.

## Project layout

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # lint, typecheck, test, build, smoke test
│   │   └── security.yml        # audit, gitleaks, semgrep, dependency review, codeql
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── findings-example.md     # sample client report
│   └── loom-script.md          # 90-second demo script
├── scripts/local-scan.sh       # run the security checks locally
├── src/
│   ├── app.ts                  # express app factory (helmet, limits, error handler)
│   ├── index.ts                # entry point, graceful shutdown
│   ├── users-store.ts          # in-memory store, scrypt hashing
│   └── routes/{health,users,login}.ts
├── test/api.test.ts            # 14 supertest tests
├── .gitleaks.toml  .semgrepignore  .env.example  SECURITY.md  LICENSE
└── eslint.config.js  tsconfig.json  vitest.config.ts  package.json
```

## Hire me

I'm **Sergio Ortiz**, a full-stack developer (TypeScript/Node, React,
OpenShift) based in Guatemala City, currently completing a master's degree in
information security. I work with startups in US and European time zones.

- Email: `sergio@example.com` <!-- replace -->
- LinkedIn: `https://linkedin.com/in/REPLACE-ME`
- Book a 20-minute call: `https://cal.com/REPLACE-ME`

Send me a link to your repo and I'll tell you honestly which package fits, or
whether you need something else entirely.

## License

[MIT](LICENSE) © 2026 Sergio Ortiz. Use it, fork it, sell services on top of
it; attribution appreciated but not required.
