#!/usr/bin/env bash
#
# self-test — lint-ratchet (frontend), T-114.
#
# Runs the REAL lint-ratchet.sh against fixture files via its own
# LINT_RATCHET_TARGETS/LINT_RATCHET_BASELINE overrides — it does not
# reimplement any part of the scan or the ratchet comparison (ADR 0007 E16:
# a self-test that rebuilds its own copy of the mechanism goes blind to the
# exact regression it exists to catch).
#
# exit 0 = all cases held · exit 1 = the guard is not behaving as documented
# (or fixtures/ is missing) — the ratchet itself is not trustworthy until
# this passes.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD="$DIR/lint-ratchet.sh"
FIXDIR="$DIR/fixtures/lint"
ERROR_FIXTURE="$FIXDIR/lint-ratchet-error.ts.fixture"
CLEAN_FIXTURE="$FIXDIR/lint-ratchet-clean.ts.fixture"

if [ ! -f "$GUARD" ]; then
  echo "!! self-test: $GUARD yok" >&2
  exit 1
fi
if [ ! -f "$ERROR_FIXTURE" ] || [ ! -f "$CLEAN_FIXTURE" ]; then
  echo "!! self-test: fixtures/lint/*.fixture eksik — guard doğrulanamıyor" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Targets are the fixtures themselves, addressed as real repo-relative paths
# (ESLint resolves config/plugins from the repo root regardless of the file's
# own extension when given an explicit path — measured, T-114: a `.ts.fixture`
# file lints exactly like a `.ts` file when named directly, and `--ext
# ts,tsx` never sees it during `eslint .`'s own directory traversal, which is
# what keeps these two fixtures out of the real baseline).
REL_ERROR="scripts/guards/fixtures/lint/lint-ratchet-error.ts.fixture"
REL_CLEAN="scripts/guards/fixtures/lint/lint-ratchet-clean.ts.fixture"
TARGETS="$REL_ERROR $REL_CLEAN"

run_report() {
  LINT_RATCHET_TARGETS="$TARGETS" GUARD_MODE=report bash "$GUARD"
}

run_ratchet() {
  # $1 = baseline file, $2 = extra targets (optional, space-separated)
  LINT_RATCHET_TARGETS="${2:-$TARGETS}" LINT_RATCHET_BASELINE="$1" bash "$GUARD" --ratchet
}

FAIL=0

# --- case 1: detector alive — the error fixture's known finding count (3:
# two `no-unused-vars` + one `no-explicit-any`, measured directly with
# `npx eslint <fixture> --format json`) must be COUNTED exactly.
REPORT_OUT="$(run_report 2>&1)"
if ! printf '%s\n' "$REPORT_OUT" | grep -qE "^\[lint-ratchet\] ${REL_ERROR}: 3 problems$"; then
  echo "!! self-test FAIL [case 1: detector]: expected '$REL_ERROR: 3 problems', got:"
  echo "$REPORT_OUT"
  FAIL=1
fi

# --- case 2: clean fixture reports zero — must not appear in findings at all.
if printf '%s\n' "$REPORT_OUT" | grep -q "$REL_CLEAN"; then
  echo "!! self-test FAIL [case 2: clean]: $REL_CLEAN olmasa gereken bir bulguda göründü"
  echo "$REPORT_OUT"
  FAIL=1
fi

# --- case 3: ratchet, baseline == current → exit 0.
printf '%s 3\n' "$REL_ERROR" > "$TMP/baseline-equal.txt"
if run_ratchet "$TMP/baseline-equal.txt" >"$TMP/ratchet-equal.out" 2>&1; then
  :
else
  echo "!! self-test FAIL [case 3: taban eşit]: --ratchet exit 0 vermeliydi"
  cat "$TMP/ratchet-equal.out"
  FAIL=1
fi

# --- case 4: ratchet, baseline < current (regression) → exit 1.
printf '%s 2\n' "$REL_ERROR" > "$TMP/baseline-under.txt"
if run_ratchet "$TMP/baseline-under.txt" >"$TMP/ratchet-under.out" 2>&1; then
  echo "!! self-test FAIL [case 4: taban aşıldı]: --ratchet bir artışı kabul etti, exit 0 döndü"
  cat "$TMP/ratchet-under.out"
  FAIL=1
else
  if ! grep -q "RATCHET VIOLATION: 2 -> 3" "$TMP/ratchet-under.out"; then
    echo "!! self-test FAIL [case 4: taban aşıldı]: exit 1 doğru ama beklenen mesaj yok"
    cat "$TMP/ratchet-under.out"
    FAIL=1
  fi
fi

# --- case 5: NEW file with findings, absent from baseline → exit 1
# ("born lint-clean" — ADR 0007 Karar 8.2's ratchet philosophy applied here).
printf '# empty baseline (no entries)\n' > "$TMP/baseline-empty.txt"
if run_ratchet "$TMP/baseline-empty.txt" >"$TMP/ratchet-new.out" 2>&1; then
  echo "!! self-test FAIL [case 5: yeni dosya]: bulgulu yeni bir dosyayı sessizce kabul etti"
  cat "$TMP/ratchet-new.out"
  FAIL=1
else
  if ! grep -q "NEW file with 3 problems" "$TMP/ratchet-new.out"; then
    echo "!! self-test FAIL [case 5: yeni dosya]: exit 1 doğru ama beklenen mesaj yok"
    cat "$TMP/ratchet-new.out"
    FAIL=1
  fi
fi

# --- case 6: GONE — a baseline line for a file that no longer exists must be
# reported and dropped from enforcement, NOT treated as a violation.
printf '%s 3\nscripts/guards/fixtures/lint/DOES_NOT_EXIST.ts.fixture 7\n' "$REL_ERROR" > "$TMP/baseline-gone.txt"
if run_ratchet "$TMP/baseline-gone.txt" >"$TMP/ratchet-gone.out" 2>&1; then
  if ! grep -q "GONE: scripts/guards/fixtures/lint/DOES_NOT_EXIST.ts.fixture" "$TMP/ratchet-gone.out"; then
    echo "!! self-test FAIL [case 6: silinmiş dosya]: GONE mesajı beklenirdi"
    cat "$TMP/ratchet-gone.out"
    FAIL=1
  fi
else
  echo "!! self-test FAIL [case 6: silinmiş dosya]: GONE bir ihlal SAYILMAMALI, exit 1 döndü"
  cat "$TMP/ratchet-gone.out"
  FAIL=1
fi

# --- case 7: OUT OF SCOPE — a baseline line for a file that exists on disk
# but sits outside this run's TARGETS (i.e. ESLint's own scan never touched
# it) must be flagged, not silently treated as "0 findings, improved".
printf '%s 3\n%s 999\n' "$REL_ERROR" "$REL_CLEAN" > "$TMP/baseline-outofscope.txt"
if run_ratchet "$TMP/baseline-outofscope.txt" "$REL_ERROR" >"$TMP/ratchet-oos.out" 2>&1; then
  echo "!! self-test FAIL [case 7: kapsam dışı]: kapsam daralmasını sessizce 'improved' saydı, exit 0"
  cat "$TMP/ratchet-oos.out"
  FAIL=1
else
  if ! grep -q "OUT OF SCOPE: still on disk but no longer covered" "$TMP/ratchet-oos.out"; then
    echo "!! self-test FAIL [case 7: kapsam dışı]: exit 1 doğru ama OUT OF SCOPE mesajı yok"
    cat "$TMP/ratchet-oos.out"
    FAIL=1
  fi
fi

# --- case 8: missing baseline file → SETUP FAILURE (exit 2), not a pass.
LINT_RATCHET_TARGETS="$TARGETS" LINT_RATCHET_BASELINE="$TMP/does-not-exist.txt" bash "$GUARD" --ratchet >"$TMP/ratchet-nobaseline.out" 2>&1
rc=$?
if [ "$rc" -ne 2 ]; then
  echo "!! self-test FAIL [case 8: taban yok]: SETUP FAILURE exit 2 bekleniyordu, $rc alındı"
  cat "$TMP/ratchet-nobaseline.out"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  {
    echo "!!"
    echo "!! lint-ratchet self-test'i kendi beklenen matrisini geçemedi. Bu, kaynak"
    echo "!! kodun temiz olduğu anlamına GELMEZ — ratchet'in ölçüm yaptığı anlamına"
    echo "!! gelmez. Beklentiyi değiştirmeden önce başlıktaki gerekçeleri oku."
  } >&2
  exit 1
fi

echo "-- [lint-ratchet] self-test: 8/8 vaka tuttu (dedektör, temiz-dosya, taban-eşit, taban-aşıldı, yeni-dosya, silinmiş-dosya, kapsam-dışı, taban-yok)"
exit 0
