# Loom demo script — 90 seconds

**Goal:** show a startup CTO that a security baseline for their CI is a
one-afternoon job, not a quarter-long project. Screen-record the repo on
GitHub with a pull request open. Speak naturally; the timings are guides.

---

**[0:00–0:10] Hook — on the README**

> "Most early-stage teams ship with zero security checks in CI. Not because
> they don't care, but because nobody has an afternoon to set it up. This repo
> is that afternoon, already done."

**[0:10–0:25] The pipeline — open `.github/workflows/security.yml`, scroll slowly**

> "One workflow, five jobs. `npm audit` for known CVEs in your dependencies.
> gitleaks for secrets in the whole git history, not just the current commit.
> Semgrep for insecure code patterns, OWASP Top Ten rules included.
> Dependency review that blocks a PR if it brings in a vulnerable package.
> And CodeQL for deeper dataflow analysis. Everything is pinned and runs with
> read-only permissions by default."

**[0:25–0:45] Show it catching something — switch to the open PR**

> "Here's a PR where I did what every tired developer does at 11 pm: pasted a
> test API key into a test file and bumped an old package."

Point at the red checks.

> "Secret scan: red, with the exact line. Dependency review: red, names the
> CVE. The PR can't merge. That's the whole point: the check runs before a
> human has to remember to look."

**[0:45–1:00] Local parity — terminal, run `npm run scan`**

> "Same checks run locally with one command, so developers see failures
> before they push instead of waiting on CI. If a tool isn't installed it
> tells you how to get it and moves on."

**[1:00–1:15] The deliverable — open `docs/findings-example.md`**

> "At the end you get this: a plain-language report. Severity, where it is,
> how it was fixed, how we verified it. Something you can forward to an
> investor or a customer's security questionnaire."

**[1:15–1:30] Close — back on README, "What I deliver" section**

> "Fixed price, two to five days depending on the package, your repo, your
> stack. If your CI has no security checks today, you'll have them by the
> end of the week. Link's below — happy to look at your repo first and tell
> you honestly which package fits."

---

**Recording checklist**

- [ ] Browser zoom 125%, dark mode off (lighter diffs record better).
- [ ] Open PR prepared in advance with a fake key (`sk_test_...` pattern) and
      an old package so both checks are red. Delete the PR branch afterwards.
- [ ] Terminal font 16pt+, `npm run scan` already run once so caches are warm.
- [ ] Mute notifications.
- [ ] Say the price range once, clearly. Don't apologise for it.
