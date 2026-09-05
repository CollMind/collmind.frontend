#!/usr/bin/env bash
#
# Guard: money-float (frontend) — T-111, ported from
# collmind.backend/scripts/guards/money-float.sh (ADR 0007 Karar 3b, 8.2).
#
# Catches: IEEE-754 entry points on money paths — `parseFloat`, `parseInt`,
# `Number(`, `toFixed`, `Math.round` — inside Domain A files.
#
# WHAT IS NOT SCANNED (read this before trusting a clean run)
# `tests/` — test files are not production money paths, and are excluded by
# name (`*.test.ts(x)`, `*.spec.ts(x)`) even for `.ts`/`.tsx` files that would
# otherwise sit under a declared directory. Domain B — `components/finance/**`,
# `features/dashboard/**` — is deliberately absent from
# money-float-domain-a.txt and is a hard error (not silently skipped) if it
# ever appears in a finding. Anything not under a directory or file named in
# money-float-domain-a.txt is not scanned at all — full reasoning, including
# what was measured and what was inferred, lives there, not here.
#
# WHY THIS GUARD EXISTS
# T-106 measured (2026-08-07): `replace(/,/g,'') + parseFloat` sat on money
# paths (agreement cap amounts, grid cell edits) for years and NOTHING counted
# it. Backend closed the equivalent gap with this exact guard (ADR 0007). This
# is the frontend half of the same trigger: a recorded baseline
# (`money-float-baseline.txt`) plus a rule that a touched Domain A file's
# finding count must not increase. Decreases are the ratchet turning.
#
# THIS GUARD CONVERTS NOTHING. It measures.
#
# WHAT DID NOT PORT — and why (T-111)
# 1. Domain A membership. Backend's test ("produces / persists / compares
#    money to a threshold") assumes a database write and a KPI recompute the
#    frontend never does. Adapted test, measured per directory, is documented
#    in full in money-float-domain-a.txt: PARSES a money value the user typed
#    or uploaded, AGGREGATES money fields client-side, or COMPARES a money
#    field to a threshold for display gating.
# 2. The allowlist / report_guard suppression machinery (lib.sh). Backend's
#    ratchet path never calls it either (report_guard runs only in the
#    unreached tail of --baseline/--ratchet invocations) — so porting it would
#    have added a mechanism this guard's actual enforcement path (--ratchet)
#    does not use. If a frontend Domain A file accumulates a legitimate
#    non-money false positive, that is a future task, not invented here.
# 3. money-float's DOMAIN_B_RE boundary against finance-reporting/kpi-engine/
#    dashboard survives, adapted to the frontend paths that render those exact
#    backend endpoints (see money-float-domain-a.txt "WHAT IS DELIBERATELY
#    ABSENT").
#
# GUARD_MODE=block   → findings cause exit 1 (bare invocation, no ratchet)
# GUARD_MODE=report  → print findings, exit 0
# --baseline / --ratchet → see bottom of file; this is the actual gate.
set -uo pipefail

GUARD_NAME="money-float"
GUARD_MODE="${GUARD_MODE:-block}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOMAIN_LIST="${MONEY_FLOAT_DOMAIN_LIST:-$ROOT/scripts/guards/money-float-domain-a.txt}"
BASELINE="${MONEY_FLOAT_BASELINE:-$ROOT/scripts/guards/money-float-baseline.txt}"
cd "$ROOT"

# Domain B paths. A finding here is not a finding — it is evidence that either
# the boundary drawn in money-float-domain-a.txt or the domain list itself is
# wrong. Reported as a hard error so it cannot be triaged away.
DOMAIN_B_RE="components/finance/|features/dashboard/"

if [ ! -f "$DOMAIN_LIST" ]; then
  # SKIPPED IS NOT A PASS, and here that has to be enforced by the exit code.
  #
  # The backend returns 0 here and is safe doing so, because `run-all.sh` greps
  # for the SKIPPED marker and turns it into a setup failure. That runner was NOT
  # ported (see "WHAT DID NOT PORT"), so a 0 here would mean: delete or rename
  # one file and this gate goes permanently, silently green. Measured before this
  # was changed: `mv money-float-domain-a.txt /tmp && npm run guard:money-float`
  # exited 0.
  #
  # §2.5, applied to a guard: a missing configuration is an error, not a default.
  echo "!! [$GUARD_NAME] SETUP FAILURE: domain list not found ($DOMAIN_LIST)" >&2
  exit 2
fi

# EXACTNESS PRIMITIVES — mirrors ADR 0007 errata E15/E16.
#
# The detector does not fire inside declared files because the same patterns
# that lose exactness elsewhere are how `numberUtils.ts` BUILDS it. See
# exactness-primitives.txt for the full argument (it is file-specific, not a
# blanket rule, and explains why the reverse case — `Number(canonical)`
# returning a `number` rather than a string — is correct here even though the
# backend's twin module needed no such call at all).
PRIMITIVES_LIST="${MONEY_FLOAT_PRIMITIVES:-$ROOT/scripts/guards/exactness-primitives.txt}"

# The declared set, comments and blanks stripped.
#
# An empty or missing declaration fails SAFE at the filter level: `grep -Fxv -f`
# with an empty pattern file matches nothing, so everything passes through
# unfiltered rather than everything being exempted. (CLAUDE.md §2.7 #4 is the
# opposite case on the backend, where an empty NEW_MODULES declaration broke
# lint repo-wide — worth knowing the direction differs here.)
#
# ⚠️ But it does NOT run clean: the embedded self_test() requires the declared
# primitive by name, so an empty or absent list exits 2 with "the declared
# primitive was not excluded". Measured — both an empty file and a nonexistent
# path. That is the right outcome (a lost declaration is a setup failure, not a
# default), and it is stated here because the filter's safe direction and the
# guard's overall exit code point different ways.
primitives() {
  [ -f "$PRIMITIVES_LIST" ] || return 0
  grep -vE '^[[:space:]]*(#|$)' "$PRIMITIVES_LIST"
}

# THE filter. Both the scan and self_test go through this one function — not
# tidiness, the whole reason self_test means anything. ADR 0007 E16: an
# earlier backend version had the self-test build its own copy of the same
# grep; mutation testing showed that left the self-test green while the real
# scan's filter was broken. `-F -x -v -f`: fixed strings, WHOLE LINE, inverted,
# from a file. Whole-line is what makes this per-file — a prefix match would
# exempt everything beneath a declared path (E15's mistake).
apply_primitive_filter() {
  grep -Fxv -f <(primitives)
}

# Resolve the declared domain-a entries — DIRECTORY or FILE, see
# money-float-domain-a.txt "FILE-LEVEL ENTRIES" for why frontend needs both —
# to a concrete, deterministically sorted file set.
#
# `.ts` and `.tsx`: unlike the backend list (TypeScript only, no JSX), money
# lives in `.tsx` components here (forms, grid cells) more often than in `.ts`
# utilities — measured (T-111): of the files under src/ with a raw
# `(parseFloat|parseInt|Number|toFixed|Math.round)\(` hit, the large majority
# are `.tsx`, not `.ts`.
domain_files() {
  local d
  while IFS= read -r d; do
    case "$d" in ''|\#*) continue ;; esac
    if [ -f "$d" ]; then
      printf '%s\n' "$d"
    elif [ -d "$d" ]; then
      find "$d" -type f \( -name "*.ts" -o -name "*.tsx" \) \
        ! -name "*.test.ts" ! -name "*.test.tsx" \
        ! -name "*.spec.ts" ! -name "*.spec.tsx" \
        2>/dev/null
    fi
  done < "$DOMAIN_LIST" | apply_primitive_filter | sort -u
}

# E15/E16 self-test — the filter above must EXCLUDE the declared primitive and
# INCLUDE everything else. Both directions: a pattern that matches nothing
# leaves the file scanned (loud — findings reappear), a pattern that matches
# too much silently drops a normal Domain A file (silent).
self_test() {
  local out rc=0
  out="$(printf '%s\n' \
      'src/utils/numberUtils.ts' \
      'src/utils/NOT_DECLARED.ts' \
      'src/components/budget/BudgetSummaryCard.tsx' \
    | apply_primitive_filter)"

  case "$out" in
    *'src/utils/numberUtils.ts'*)
      echo "-- [$GUARD_NAME] SELF-TEST FAIL: the declared primitive was not excluded"
      rc=1 ;;
  esac
  case "$out" in
    *'src/utils/NOT_DECLARED.ts'*) ;;
    *)
      echo "-- [$GUARD_NAME] SELF-TEST FAIL: an UNDECLARED file was exempted — the exemption is per-file (E16), not per-directory"
      rc=1 ;;
  esac
  case "$out" in
    *'BudgetSummaryCard.tsx'*) ;;
    *)
      echo "-- [$GUARD_NAME] SELF-TEST FAIL: filter excluded a normal Domain A file"
      rc=1 ;;
  esac
  return $rc
}
self_test || exit 2

FILES="$(domain_files)"

if [ -z "$FILES" ]; then
  # Same reasoning as the missing-list branch above: an empty scope and a clean
  # scope produce the same "no findings", so the empty one must not exit 0.
  echo "!! [$GUARD_NAME] SETUP FAILURE: domain list resolved to zero files" >&2
  exit 2
fi

# Detection.
#
# `(^|[^A-Za-z0-9_$])` prefix is load-bearing: without it, `safeNumber(` (a
# wrapper name used throughout `components/budget/*`) would match `Number(`.
# Measured (T-111): a naive substring scan over the same domain-a set counted
# 15 findings in BudgetEnvelopeList.tsx; the boundary-safe scan counts 4 — the
# other 11 were `safeNumber(...)` calls (a wrapper around the exempted
# `toNumberOrZero`, itself already a call the wrapper — not this call site —
# is responsible for). A baseline built on the naive number would ratchet
# noise, not debt.
#
# Comment handling is line-level (a trimmed line starting with `//`, `*`,
# `/*` is skipped) — same heuristic and same recorded limit as the backend
# guard: a `Number(` inside a multi-line block comment whose OWN line does not
# start with a comment marker will still be reported. Over-report is the safe
# direction; there is no allowlist here to absorb it (see header) so any such
# case becomes a baseline entry instead, visible in the same diff a reviewer
# already has to read.
scan() {
  printf '%s\n' "$FILES" | while IFS= read -r f; do
    [ -n "$f" ] || continue
    awk -v file="$f" -v guard="$GUARD_NAME" '
      {
        line = $0
        t = line; sub(/^[ \t]+/, "", t); sub(/[ \t]+$/, "", t)
        if (t ~ /^(\/\/|\*|\/\*)/) next

        n = 0
        if (match(t, /(^|[^A-Za-z0-9_$])parseFloat\(/))  { n++; what = "parseFloat" }
        if (match(t, /(^|[^A-Za-z0-9_$])parseInt\(/))    { n++; what = "parseInt" }
        if (match(t, /(^|[^A-Za-z0-9_$])Number\(/))      { n++; what = "Number()" }
        if (match(t, /(^|[^A-Za-z0-9_$])toFixed\(/))     { n++; what = "toFixed" }
        if (match(t, /(^|[^A-Za-z0-9_$])Math\.round\(/)) { n++; what = "Math.round" }
        if (n == 0) next
        if (n > 1) what = "multiple float entry points"

        printf "[%s] %s:%d\n", guard, file, NR
        printf "  %s on a Domain A (money) path — T-111 / ADR 0007 Karar 3b ratchet\n", what
        printf "  > %s\n", t
      }
    ' "$f"
  done
}

RAW="$(scan)"

# Boundary check before anything else: a Domain B hit must never be
# suppressible or silently absorbed.
LEAK="$(printf '%s\n' "$RAW" | grep -E "^\[$GUARD_NAME\] .*($DOMAIN_B_RE)" || true)"
if [ -n "$LEAK" ]; then
  {
    echo "!! [$GUARD_NAME] Domain B file appeared in findings — boundary violated"
    echo "!! money-float-domain-a.txt puts components/finance and features/dashboard"
    echo "!! in Domain B (they RENDER /finance-reporting and /dashboard data)."
    echo "!! Either the boundary is wrong or the domain list is. Not allowlistable."
    printf '%s\n' "$LEAK"
  } >&2
  exit 2
fi

# --- ratchet -----------------------------------------------------------------
# Explicit invocation only. A baseline that rewrites itself cannot be
# reviewed, so nothing here ever writes to $BASELINE.
#
#   money-float.sh --baseline   → emit a fresh baseline on stdout (operator
#                                 redirects it; the write is a reviewable diff)
#   money-float.sh --ratchet    → compare current counts to the baseline
#
counts_by_file() {
  printf '%s\n' "$RAW" | grep -E "^\[$GUARD_NAME\] " \
    | sed -E "s/^\[$GUARD_NAME\] //; s/:[0-9]+$//" \
    | sort | uniq -c | awk '{printf "%s %s\n", $2, $1}' | sort
}

case "${1:-}" in
  --baseline)
    echo "# money-float baseline (frontend) — T-111 / ADR 0007 Karar 3b ratchet reference"
    echo "# date:    $(date +%Y-%m-%d)"
    echo "# commit:  $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
    echo "# guard:   money-float v1 (frontend)"
    echo "# total:   $(printf '%s\n' "$RAW" | grep -c "^\[$GUARD_NAME\] " || true) findings in $(counts_by_file | wc -l | tr -d ' ') files"
    echo "# format:  <file> <count>   (sorted by file; only non-zero counts)"
    counts_by_file
    exit 0
    ;;
  --ratchet)
    if [ ! -f "$BASELINE" ]; then
      echo "!! [$GUARD_NAME] no baseline at $BASELINE — run --baseline first" >&2
      exit 2
    fi
    CUR="$(counts_by_file)"
    RC=0
    # Z82 iş 1: "improved" used to be a note, exit 0. Now a gate — see below.
    IMPROVED_COUNT=0
    while read -r file count; do
      case "$file" in ''|\#*) continue ;; esac
      # A MALFORMED COUNT IS A SETUP FAILURE, not a zero.
      #
      # Without this, `[ "$now" -gt "$count" ]` errors out on a non-numeric
      # count, leaves RC untouched, and the loop carries on — so one corrupted
      # line (a hand-edited "improved" update, a merge artefact, a paste) turns
      # that file's ratchet off permanently and the only trace is bash noise on
      # stderr. Measured before this check: a corrupted count plus TWO real
      # violations in the same file exited 0.
      case "$count" in
        ''|*[!0-9]*)
          echo "!! [$GUARD_NAME] SETUP FAILURE: malformed baseline line for $file (count: '$count')" >&2
          exit 2
          ;;
      esac
      now="$(printf '%s\n' "$CUR" | awk -v f="$file" '$1==f {print $2}')"
      if [ ! -e "$file" ]; then
        echo "-- [$GUARD_NAME] GONE: $file (baseline $count) — deleted or renamed; drop the line in the same commit"
        continue
      fi
      # A file that still EXISTS but is no longer scanned has not repaid its
      # debt — it has left the scope. Reporting that as "improved" invites the
      # operator to bless a shrunken scope by updating the baseline. Measured
      # before this check: removing `src/utils/export.ts` from the domain list
      # printed "improved: 16 -> 0" and exited 0.
      #
      # This is the same distinction ADR 0007 E16 drew for the primitives list
      # ("it cannot tell a repayment from a relocation"), applied to the domain
      # list — where it had been left to convention.
      # [[T-359b]] sigpipe-hygiene: `printf ... | grep -q` yerine herestring —
      # boru sağında erken kapanan bir tüketici SIGPIPE riski taşırdı (T-359).
      if ! grep -qxF "$file" <<< "$FILES"; then
        echo "[$GUARD_NAME] $file"
        echo "  OUT OF SCOPE: still on disk but no longer covered by the domain list (baseline $count)"
        echo "  A scope removal is not a repayment. Restore it, or remove the baseline line in the same commit with a reason."
        RC=1
        continue
      fi
      now="${now:-0}"
      if [ "$now" -gt "$count" ]; then
        echo "[$GUARD_NAME] $file"
        echo "  RATCHET VIOLATION: $count -> $now findings"
        RC=1
      elif [ "$now" -lt "$count" ]; then
        echo "-- [$GUARD_NAME] improved: $file $count -> $now (update baseline explicitly)"
        IMPROVED_COUNT=$((IMPROVED_COUNT + 1))
      fi
    done < "$BASELINE"

    while read -r file count; do
      [ -n "$file" ] || continue
      if ! grep -qE "^${file} " "$BASELINE"; then
        echo "[$GUARD_NAME] $file"
        echo "  NEW Domain A file with $count findings — new code must be born exact (ADR 0007 Karar 8.2)"
        RC=1
      fi
    done <<< "$CUR"

    # Z82 iş 1: an "improved" note is now a gate, distinct from RATCHET
    # VIOLATION / OUT OF SCOPE / NEW — same exit code (1), different label
    # (Z77 §1a emsali).
    if [ "$IMPROVED_COUNT" -gt 0 ]; then
      echo
      echo "!! [$GUARD_NAME] BASELINE STALE: $IMPROVED_COUNT file(s) improved vs baseline but the baseline was not lowered." >&2
      echo "!! Fix (in a SEPARATE commit, AFTER this one):" >&2
      echo "!!   bash scripts/guards/money-float.sh --baseline > scripts/guards/money-float-baseline.txt" >&2
      RC=1
    fi

    exit "$RC"
    ;;
esac

# Normal (non-ratchet) run: print raw findings, no allowlist suppression (see
# header — this guard carries none). --baseline/--ratchet above exit before
# reaching here on purpose: they write machine-read output to stdout.
if [ -n "$RAW" ]; then
  printf '%s\n' "$RAW"
fi
COUNT="$(printf '%s\n' "$RAW" | grep -c "^\[$GUARD_NAME\] " || true)"

if [ "$GUARD_MODE" = "block" ] && [ "$COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
