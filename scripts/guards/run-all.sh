#!/usr/bin/env bash
# Runs every frontend guard and decides the exit code ONCE, here.
#
# WHY THIS EXISTS — measured, not anticipated.
#
# `guards` used to be `npm run guard:money-float && npm run guard:lint`. With a
# real violation planted in BOTH baselines:
#
#     npm run guards      -> exit 1, money-float's violation printed,
#                            lint-ratchet's violation NOT PRINTED AT ALL
#     npm run guard:lint  -> exit 1, the same lint violation, on its own
#
# So `&&` does not just reorder output — it HIDES findings. A developer fixes the
# first guard, re-runs, and only then learns there was a second problem; and the
# "guards green" line in CLAUDE.md §4.2 reads as green for that iteration.
#
# T-119 predicted this in words ("the moment a second guard is added") and the
# second guard arrived in the same change that proved it.
#
# EXIT CODES, and why 2 is not merged into 1:
#   0  every guard ran and found nothing
#   1  at least one guard reported a FINDING (real debt — fix the code)
#   2  at least one guard could not RUN (missing/malformed config, dead detector)
#
# A setup failure is not a pass and not a finding: it means the measurement did
# not happen. Collapsing it into 1 would tell someone to go looking for debt that
# was never measured. 2 outranks 1 for that reason.
#
# WHAT IS STILL MISSING (T-119, deliberately not built here): each guard declares
# its own exit-2 branches instead of inheriting a shared policy, and
# `self-test.sh` is generically named while being money-float's alone.
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

GUARDS="guard:money-float guard:lint"

worst=0
failed=""
for g in $GUARDS; do
  echo "=== [$g] ==="
  npm run --silent "$g"
  rc=$?
  # Never `&&`: every guard runs, whatever the ones before it did.
  if [ "$rc" -ne 0 ]; then
    failed="$failed $g(exit $rc)"
    [ "$rc" -gt "$worst" ] && worst="$rc"
  fi
done

echo
if [ "$worst" -eq 0 ]; then
  echo "-- [guards] all clean"
else
  echo "!! [guards] failing:$failed"
  [ "$worst" -eq 2 ] && echo "!! exit 2 = a guard could not RUN. Its findings were never measured."
fi
exit "$worst"
