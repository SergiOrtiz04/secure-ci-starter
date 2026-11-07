#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# local-scan.sh — run the same security checks as .github/workflows/security.yml
# on your machine, before you push.
#
# Usage:
#   npm run scan            # or: bash scripts/local-scan.sh
#   bash scripts/local-scan.sh --no-docker   # skip docker-based fallbacks
#
# Each check is independent. Missing tools are reported, not fatal, so you
# still get value from whatever is installed. Exit code is non-zero if ANY
# check that actually ran found a problem.
#
# Tool resolution order:
#   npm audit  → always (npm is required for the project anyway)
#   gitleaks   → local binary, else docker image ghcr.io/gitleaks/gitleaks
#   semgrep    → local binary (pip install semgrep), else docker image semgrep/semgrep
# ---------------------------------------------------------------------------
set -u

USE_DOCKER=1
for arg in "$@"; do
  case "$arg" in
    --no-docker) USE_DOCKER=0 ;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Colours only when writing to a terminal.
if [ -t 1 ]; then
  BOLD=$'\e[1m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; RED=$'\e[31m'; RESET=$'\e[0m'
else
  BOLD=''; GREEN=''; YELLOW=''; RED=''; RESET=''
fi

FAILED=0
SKIPPED=0

section() { printf '\n%s== %s ==%s\n' "$BOLD" "$1" "$RESET"; }
ok()      { printf '%s[ok]%s %s\n' "$GREEN" "$RESET" "$1"; }
warn()    { printf '%s[skip]%s %s\n' "$YELLOW" "$RESET" "$1"; SKIPPED=$((SKIPPED + 1)); }
fail()    { printf '%s[FAIL]%s %s\n' "$RED" "$RESET" "$1"; FAILED=$((FAILED + 1)); }

have()    { command -v "$1" >/dev/null 2>&1; }

# Interpret a scanner's exit code: 0 = clean, 1 = findings, anything else =
# the tool itself failed (network, bad config). Treat the last case as a skip
# so a flaky registry download isn't reported as a security finding.
report() { # $1=tool $2=exit code $3=ok message $4=fail message
  case "$2" in
    0) ok "$3" ;;
    1) fail "$4" ;;
    *) warn "$1 could not complete (exit $2). Usually a network/registry issue; CI will retry." ;;
  esac
}
docker_ok() { [ "$USE_DOCKER" -eq 1 ] && have docker && docker info >/dev/null 2>&1; }

# ---------------------------------------------------------------------------
section "1/3 npm audit (high and critical)"
if ! have npm; then
  warn "npm not found; install Node.js 20+ from https://nodejs.org"
elif [ ! -d node_modules ]; then
  echo "node_modules missing, running npm ci first..."
  npm ci --silent || { fail "npm ci failed"; }
fi
if have npm && [ -d node_modules ]; then
  if npm audit --audit-level=high; then
    ok "no high/critical vulnerabilities"
  else
    fail "npm audit reported high/critical vulnerabilities (see above)"
  fi
  echo
  echo "Outdated packages (informational):"
  npm outdated || true
fi

# ---------------------------------------------------------------------------
section "2/3 gitleaks (secret scanning, full git history)"
GITLEAKS_ARGS=(git --redact --config .gitleaks.toml --verbose .)
if have gitleaks; then
  gitleaks "${GITLEAKS_ARGS[@]}"; rc=$?
  report gitleaks "$rc" "no secrets found" "gitleaks found potential secrets"
elif docker_ok; then
  echo "gitleaks binary not found, using docker image..."
  docker run --rm -v "$ROOT:/repo" -w /repo ghcr.io/gitleaks/gitleaks:latest "${GITLEAKS_ARGS[@]}"; rc=$?
  report gitleaks "$rc" "no secrets found" "gitleaks found potential secrets"
else
  warn "gitleaks not installed and docker unavailable.
       Install: brew install gitleaks | https://github.com/gitleaks/gitleaks#installing
       Or start Docker Desktop and re-run."
fi

# ---------------------------------------------------------------------------
section "3/3 semgrep (SAST: p/ci, p/nodejs, p/owasp-top-ten)"
SEMGREP_ARGS=(scan --config p/ci --config p/nodejs --config p/owasp-top-ten --error --metrics=off --quiet)
if have semgrep; then
  semgrep "${SEMGREP_ARGS[@]}"; rc=$?
  report semgrep "$rc" "no SAST findings" "semgrep reported findings"
elif docker_ok; then
  echo "semgrep binary not found, using docker image..."
  docker run --rm -v "$ROOT:/src" -w /src semgrep/semgrep:latest semgrep "${SEMGREP_ARGS[@]}"; rc=$?
  report semgrep "$rc" "no SAST findings" "semgrep reported findings"
else
  warn "semgrep not installed and docker unavailable.
       Install: pip install semgrep  (or: brew install semgrep)
       Or start Docker Desktop and re-run."
fi

# ---------------------------------------------------------------------------
section "Summary"
if [ "$FAILED" -gt 0 ]; then
  printf '%s%d check(s) failed%s, %d skipped.\n' "$RED" "$FAILED" "$RESET" "$SKIPPED"
  exit 1
fi
if [ "$SKIPPED" -gt 0 ]; then
  printf '%sAll executed checks passed%s, but %d were skipped (tools missing).\n' "$GREEN" "$RESET" "$SKIPPED"
  echo "CI will run the full set; install the missing tools to match it locally."
  exit 0
fi
printf '%sAll checks passed.%s\n' "$GREEN" "$RESET"
