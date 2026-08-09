#!/usr/bin/env bash
#
# Guard: lint-ratchet (frontend) — T-114.
#
# WHY THIS GUARD EXISTS
# `npm run lint` (`eslint . --ext ts,tsx --report-unused-disable-directives
# --max-warnings 0`) is intentionally full-repo — see scripts/changed-files.sh:
# "lint here is a CHECKER (no --fix) and still reads the whole repo —
# narrowing a checker is how a guard goes blind." This guard does not reopen
# that decision.
#
# Measured (T-114, 2026-08-09): `npm run lint` → exit 1, 488 problems (470
# errors, 18 warnings) across 112 files, BEFORE this guard's own baseline was
# taken (it is taken after, see lint-ratchet-baseline.txt). That count is the
# same whether the commit under review added a new violation or removed ten —
# `npm run lint` exits 1 either way, so on its own it carries no signal. This
# is T-100's mirror in the opposite direction: T-100's gate exits 0 no matter
# what (scope empties itself); this one exits 1 no matter what (scope never
# shrinks). Both are "the gate's ayırt etme gücü yok" (§2.7).
#
# THIS GUARD DOES NOT LOWER THE BAR. `npm run lint` keeps failing on today's
# 488 problems, and it should — they are real violations, not this guard's to
# waive. This is a SEPARATE, additive check: a file's problem COUNT (errors +
# warnings — `--max-warnings 0` already treats warnings as must-fix, so this
# ratchet does too) must not increase relative to the recorded baseline.
#
# WHY THIS PORTS money-float.sh'S SHAPE BUT NOT ITS SCANNER
# money-float.sh hand-writes a regex detector because no existing tool
# recognizes "money-losing float entry point on a Domain A path" — that
# invented detector is exactly what ADR 0007 E15/E16 warn about duplicating
# in its own self-test. This guard has no such risk: ESLint IS the detector,
# already correct, already exercised by `npm run lint` every day. This script
# only aggregates ESLint's own per-file JSON output (`errorCount +
# warningCount`) and diffs it against a baseline — the baseline/ratchet/GONE/
# OUT-OF-SCOPE/malformed-count machinery below is the part worth reusing from
# money-float.sh, so it is reused, not reinvented.
#
# SCOPE — identical to `npm run lint`, by construction: both this guard's
# scan() and package.json's "lint" script invoke `eslint . --ext ts,tsx`. A
# file this guard doesn't see is a file `npm run lint` doesn't see either;
# there is no separate domain list to fall out of sync with (unlike
# money-float-domain-a.txt).
#
# GUARD_MODE=block   → any current problem count > 0 anywhere causes exit 1
#                       (bare invocation — rarely the interesting mode today,
#                       since the baseline already carries 488 problems;
#                       --ratchet below is the actual gate)
# GUARD_MODE=report  → print per-file counts, exit 0
# --baseline / --ratchet → see bottom of file; --ratchet is what `npm run
#                       guard:lint` actually calls
set -uo pipefail

GUARD_NAME="lint-ratchet"
GUARD_MODE="${GUARD_MODE:-block}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASELINE="${LINT_RATCHET_BASELINE:-$ROOT/scripts/guards/lint-ratchet-baseline.txt}"
# Overridable so lint-ratchet-self-test.sh can point the scan at fixture
# files instead of the real tree (T-111's self-test used the equivalent
# MONEY_FLOAT_DOMAIN_LIST override for the same reason).
TARGETS="${LINT_RATCHET_TARGETS:-.}"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  # §2.5 applied to a guard: a missing dependency is an error, not a silent
  # pass. node is a hard prerequisite of this project (every npm script runs
  # through it), so its absence means the environment itself is broken, not
  # that there is nothing to scan.
  echo "!! [$GUARD_NAME] SETUP FAILURE: node not found on PATH" >&2
  exit 2
fi

# The scan. `--format json` gives ESLint's own, already-correct per-file
# errorCount/warningCount — this script never re-implements a rule.
#
# stderr is kept separate: ESLint prints "Oops!" configuration failures to
# stderr and a non-JSON payload to stdout in that case, and a JSON parse
# failure two steps later would otherwise read as "zero findings" (§2.5 — a
# parse failure collapsing to zero is exactly the silent-zero this guard
# must not produce).
RAW_JSON="$(mktemp -t lint-ratchet-raw.XXXXXX.json)"
RAW_STDERR="$(mktemp -t lint-ratchet-raw.XXXXXX.stderr)"
trap 'rm -f "$RAW_JSON" "$RAW_STDERR"' EXIT

# shellcheck disable=SC2086 # TARGETS/EXTRA_ARGS are internal, space-separated by design
npx eslint $TARGETS --ext ts,tsx --format json ${LINT_RATCHET_EXTRA_ARGS:-} \
  >"$RAW_JSON" 2>"$RAW_STDERR"
ESLINT_RC=$?
# ESLint's own exit code: 0 = no problems, 1 = lint problems found (still a
# successful run — that is what --ratchet exists to interpret), 2 = a fatal
# error (bad config, crash). Only 2 is a setup failure here.
if [ "$ESLINT_RC" -ge 2 ]; then
  echo "!! [$GUARD_NAME] SETUP FAILURE: eslint exited $ESLINT_RC (fatal, not a lint finding)" >&2
  cat "$RAW_STDERR" >&2
  exit 2
fi

if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$RAW_JSON" 2>/dev/null; then
  echo "!! [$GUARD_NAME] SETUP FAILURE: eslint --format json did not produce parseable JSON" >&2
  cat "$RAW_STDERR" >&2
  exit 2
fi

# Every file ESLint actually processed, WITH ITS COUNT — including files with
# zero problems. This is the file this guard's version of money-float's
# domain_files() (the scanned set) and counts_by_file() (the >0 subset) both
# come from in one pass: "in scope" is "appears in this list at all",
# "has findings" is "count > 0" (money-float needed two separate functions
# because its domain list and its finding-detector are different mechanisms;
# here they are the same ESLint invocation, so one table serves both).
all_files_with_counts() {
  node -e '
    const fs = require("fs");
    const path = require("path");
    const root = process.argv[1];
    const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const rows = data.map((f) => {
      const rel = path.relative(root, f.filePath);
      const count = f.errorCount + f.warningCount;
      return [rel, count];
    });
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    for (const [f, c] of rows) console.log(f + " " + c);
  ' "$ROOT" "$RAW_JSON"
}

ALL="$(all_files_with_counts)"
# The >0 subset — this is what "findings" means everywhere below.
CUR="$(printf '%s\n' "$ALL" | awk '$2 != 0')"

if [ -z "$ALL" ]; then
  # Same reasoning as money-float's "domain list resolved to zero files":
  # an empty scan and a clean scan both produce no findings, so the empty one
  # must not be allowed to exit 0 disguised as "all clean".
  echo "!! [$GUARD_NAME] SETUP FAILURE: eslint scanned zero files (target: '$TARGETS')" >&2
  exit 2
fi

counts_by_file() {
  printf '%s\n' "$CUR"
}

case "${1:-}" in
  --baseline)
    echo "# lint-ratchet baseline (frontend) — T-114 ratchet reference"
    echo "# date:    $(date +%Y-%m-%d)"
    echo "# commit:  $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
    echo "# guard:   lint-ratchet v1 (frontend)"
    echo "# total:   $(printf '%s\n' "$CUR" | grep -c . || true) files with findings, $(printf '%s\n' "$CUR" | awk '{s+=$2} END {print s+0}') problems"
    echo "# format:  <file> <errorCount+warningCount>   (sorted by file; only non-zero counts)"
    counts_by_file
    exit 0
    ;;
  --ratchet)
    if [ ! -f "$BASELINE" ]; then
      echo "!! [$GUARD_NAME] no baseline at $BASELINE — run --baseline first" >&2
      exit 2
    fi
    RC=0
    while read -r file count; do
      case "$file" in ''|\#*) continue ;; esac
      # A malformed count is a setup failure, not a zero (money-float's same
      # protection — a hand-edited "improved" line or a merge artefact must
      # not silently turn this file's ratchet off).
      case "$count" in
        ''|*[!0-9]*)
          echo "!! [$GUARD_NAME] SETUP FAILURE: malformed baseline line for $file (count: '$count')" >&2
          exit 2
          ;;
      esac
      if [ ! -e "$file" ]; then
        echo "-- [$GUARD_NAME] GONE: $file (baseline $count) — deleted or renamed; drop the line in the same commit"
        continue
      fi
      # Exact-field match (not a regex on the raw filename — filenames can
      # contain `.` and other ERE metacharacters) against the FULL scanned
      # set (zero-count files included), so "in scope with 0 findings" and
      # "not scanned at all" are distinguishable.
      now="$(printf '%s\n' "$ALL" | awk -v f="$file" '$1==f {print $2; found=1} END {if (!found) print "__NOTFOUND__"}')"
      if [ "$now" = "__NOTFOUND__" ]; then
        # File exists on disk but ESLint's own scan (identical scope to
        # `npm run lint`) no longer processed it — e.g. a new ignorePatterns
        # entry. Same distinction ADR 0007 E16 drew for money-float's domain
        # list: a scope shrink is not a repayment.
        echo "[$GUARD_NAME] $file"
        echo "  OUT OF SCOPE: still on disk but no longer covered by the lint scan (baseline $count)"
        echo "  A scope removal is not a repayment. Restore it, or remove the baseline line in the same commit with a reason."
        RC=1
        continue
      fi
      if [ "$now" -gt "$count" ]; then
        echo "[$GUARD_NAME] $file"
        echo "  RATCHET VIOLATION: $count -> $now problems"
        RC=1
      elif [ "$now" -lt "$count" ]; then
        echo "-- [$GUARD_NAME] improved: $file $count -> $now (update baseline explicitly)"
      fi
    done < "$BASELINE"

    while read -r file count; do
      [ -n "$file" ] || continue
      # Exact-field match against the baseline (not `grep -E "^${file} "` —
      # a filename containing `.` or other ERE metacharacters would match
      # more than intended there, the same class of mistake ERRATA E15
      # recorded for money-float's own filter).
      if ! awk -v f="$file" '$1==f {found=1} END {exit !found}' "$BASELINE"; then
        echo "[$GUARD_NAME] $file"
        echo "  NEW file with $count problems — new/touched code must be born lint-clean, not added to the debt this ratchet is tracking down"
        RC=1
      fi
    done <<< "$CUR"

    exit "$RC"
    ;;
esac

# Normal (non-ratchet) run: print per-file counts, no baseline comparison.
if [ -n "$CUR" ]; then
  printf '%s\n' "$CUR" | while read -r file count; do
    [ -n "$file" ] || continue
    echo "[$GUARD_NAME] $file: $count problems"
  done
fi
TOTAL="$(printf '%s\n' "$CUR" | awk '{s+=$2} END {print s+0}')"

if [ "$GUARD_MODE" = "block" ] && [ "$TOTAL" -gt 0 ]; then
  exit 1
fi
exit 0
