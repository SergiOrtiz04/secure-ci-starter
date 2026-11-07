# Security findings report — example

> **This is a sample deliverable.** It shows the format a client receives at
> the end of a "security baseline" engagement: what the pipeline found on the
> first run, what it means in plain language, how it was fixed, and proof that
> the fix holds. The three findings below are realistic and were reproduced on
> a copy of this repo; they are not present in the current code.

| Field        | Value                                        |
| ------------ | -------------------------------------------- |
| Client       | Acme Startup Inc. (example)                  |
| Repository   | `acme/api`                                   |
| Scope        | Node.js API, `main` branch, full git history |
| Engagement   | Security baseline — Package B                |
| Date         | 2026-11-03                                   |
| Prepared by  | Sergio Ortiz                                 |

## Summary

| Severity | Count | Fixed | Open |
| -------- | ----: | ----: | ---: |
| Critical |     1 |     1 |    0 |
| High     |     1 |     1 |    0 |
| Medium   |     1 |     1 |    0 |
| Low      |     0 |     0 |    0 |

Three findings on the first pipeline run. All three were fixed and verified in
the same engagement. The pipeline now runs green on every pull request and
re-scans the repository weekly.

## Findings

| #   | Severity | Finding                                         | Location                                                      | Caught by                                                                  | Fix                                                                                                      | Status |
| --- | -------- | ----------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Critical | Live Stripe secret key committed in a test file | `test/payments.test.ts:12` (and git history, 14 commits back) | gitleaks (`stripe-access-token` rule)                                      | Key revoked and rotated in Stripe dashboard; test now reads `STRIPE_TEST_KEY` from env; history scrubbed | Fixed  |
| 2   | High     | `lodash@4.17.15` with prototype-pollution CVEs  | `package-lock.json` (transitive via `express-validator@6.4`)  | `npm audit` (GHSA-p6mc-m468-83gw, GHSA-35jh-r3h4-6jhm) + Dependency review | Bumped to `lodash@4.17.21`; added Dependabot so this doesn't recur                                       | Fixed  |
| 3   | Medium   | No rate limiting on `POST /auth/login`          | `src/routes/auth.ts:31`                                       | Semgrep (`p/nodejs`: `express-missing-rate-limit`) + manual review         | Added `express-rate-limit` (5 attempts / 15 min / IP) and a regression test                              | Fixed  |

### 1. Hard-coded Stripe secret key (Critical)

**What the pipeline saw.** The `Secret scan` job failed on the first run.
gitleaks scans the entire git history, not just the current files, and flagged a
string matching the Stripe live-key format in a test file:

```
Finding:     const stripe = new Stripe("sk_live_REDACTED...")
Secret:      REDACTED
RuleID:      stripe-access-token
Entropy:     4.61
File:        test/payments.test.ts
Line:        12
Commit:      3f9a2c1
Author:      dev@acme.example
Date:        2026-02-18T14:02:11Z
```

**Why it matters.** A live Stripe key gives full control over the account:
refunds, payouts, customer data. The repository was private, but private repos
leak through laptop theft, contractor off-boarding, CI logs and accidental
visibility changes. Secrets in git history survive `git rm`.

**Fix applied.**

1. Key revoked immediately in the Stripe dashboard and a new restricted key
   issued (checked with the client first; rotation can break production).
2. Test rewritten to read `process.env.STRIPE_TEST_KEY`, documented in
   `.env.example`, injected in CI through a GitHub Actions secret.
3. History rewritten with `git filter-repo` and force-pushed, with the team
   re-cloning. (Optional; the key was already dead, but it keeps future scans
   quiet and removes the evidence from any forks.)

**Verification.** `Secret scan` job green on the follow-up PR; manual
`gitleaks git .` run on the rewritten history returned zero findings.

### 2. Outdated `lodash` with known CVEs (High)

**What the pipeline saw.** `npm audit --audit-level=high` exited non-zero:

```
lodash  <4.17.21
Severity: high
Prototype Pollution in lodash - https://github.com/advisories/GHSA-p6mc-m468-83gw
Command Injection in lodash   - https://github.com/advisories/GHSA-35jh-r3h4-6jhm
node_modules/lodash
  express-validator  <=6.5.0
  Depends on vulnerable versions of lodash
```

**Why it matters.** Nobody imported `lodash` directly; it arrived through an
old `express-validator`. Prototype pollution in a request-handling library lets
an attacker who controls JSON input alter the behaviour of unrelated code.
Transitive dependencies are the most common way vulnerable code enters a
project, which is exactly why the audit runs against the lockfile and not only
`package.json`.

**Fix applied.** Updated `express-validator` to `7.x` (which dropped the
dependency) and ran `npm audit fix`. Enabled Dependabot (`.github/dependabot.yml`)
with weekly grouped PRs so the next outdated package arrives as a reviewed
pull request instead of a surprise.

**Verification.** `npm audit` reports zero vulnerabilities; `Dependency review`
job on the PR showed the removed advisories; test suite green.

### 3. Missing rate limit on the login endpoint (Medium)

**What the pipeline saw.** Semgrep's `p/nodejs` ruleset flagged an Express
route handling credentials without any limiter middleware in scope:

```
src/routes/auth.ts
   ❯❯ javascript.express.security.audit.express-missing-rate-limit
      Route "/auth/login" handles authentication but no rate-limiting
      middleware was detected. Brute-force attacks may be possible.
      31┆ router.post('/login', async (req, res) => {
```

**Why it matters.** Without a limit, an attacker can try thousands of
passwords per minute against a single account, or run credential-stuffing
lists against many accounts. bcrypt/scrypt slow this down per attempt but do
not stop it. A rate limit is the cheapest control with the biggest effect on
this class of attack.

**Fix applied.** Added `express-rate-limit` on the login router (5 attempts per
15 minutes per IP, successful logins not counted), set `trust proxy` correctly
for the client's load balancer so the limit keys on the real client IP, and
added a Vitest regression test that asserts the 6th attempt returns `429`.

**Verification.** Semgrep finding cleared; new test
`blocks the 6th login attempt within the window` passes in CI.

## What was NOT covered

Being explicit about limits is part of the deliverable:

- No manual penetration test or business-logic review was performed. Static
  tools do not find authorisation bugs ("user A can read user B's invoice").
- Infrastructure (cloud IAM, network, database configuration) was out of scope.
- Dependency and secret scanning are only as good as their rule sets and
  advisory databases on the day they run. The weekly schedule mitigates this.

## Recommended next steps

1. Enable branch protection on `main` requiring the `Security` and `CI`
   workflows to pass before merge.
2. Keep the SHA pins current: review Dependabot's weekly `chore(actions)` PRs
   rather than ignoring them.
3. Schedule a short authorisation review of the API once the baseline has run
   for a month and the team is used to the PR checklist.
