#!/usr/bin/env bash
#
# self-test — money-float (frontend), T-111 follow-up.
#
# NEDEN VAR (ADR 0007 errata E15 + E16, ölçülerek doğrulanmış — coordinator
# review, T-111): backend'de bu dosya TESADÜFEN değil, iki kayıtlı sessiz
# yanlış-negatif yüzünden var:
#
#   E15: bir desen kodda duruyordu, incelemede doğru görünüyordu, ve HİÇBİR
#        ŞEYLE eşleşmiyordu (BSD grep BRE'de `\?` desteklenmiyor). Yalnız
#        SONUCU ölçmek gösterdi.
#   E16: self-test'in kendisi filtreyi KENDİ KOPYASIYLA kuruyordu ve guard'ı
#        korumak için var olduğu regresyona KÖR kaldı — exit 0 verdi.
#
# Bu script money-float.sh'in GERÇEK guard'ını koştursun diye var — filtreyi
# yeniden uygulamaz (E16'nın hatası tam buydu). Kaynak ağacına yazmaz; kendi
# fixture'larını `mktemp -d` altına kopyalar ve env override'ları
# (MONEY_FLOAT_DOMAIN_LIST / MONEY_FLOAT_PRIMITIVES / MONEY_FLOAT_BASELINE)
# ile guard'ı o geçici ağaca yönlendirir.
#
# exit 0 = beklenen beş vaka da tuttu · exit 1 = guard beklendiği gibi
# davranmıyor (ya da fixtures/ eksik) — ölçüm güvenilmez, koşum burada durur.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD="$DIR/money-float.sh"
FIXTURES="$DIR/fixtures"
REAL_PRIMITIVES="$DIR/exactness-primitives.txt"

if [ ! -d "$FIXTURES" ]; then
  echo "!! self-test: fixtures/ dizini yok — guard doğrulanamıyor" >&2
  exit 1
fi
if [ ! -f "$GUARD" ]; then
  echo "!! self-test: $GUARD yok" >&2
  exit 1
fi

# T-113'ün teardown dersi: yarıda ölse bile temizlik çalışsın.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/domainA" "$TMP/domainB"

cp "$FIXTURES/money-float-positive.ts.fixture"  "$TMP/domainA/money-float-positive.ts"
cp "$FIXTURES/money-float-primitive.ts.fixture"  "$TMP/domainA/money-float-primitive.ts"
cp "$FIXTURES/money-float-domain-b.ts.fixture"   "$TMP/domainB/money-float-domain-b.ts"

# Domain list: only domainA is declared. domainB exists on disk but is named
# NOWHERE in this list — that absence IS the scope control (case 4 below).
printf '%s\n' "$TMP/domainA" > "$TMP/domain-list.txt"

# Primitives list: the REAL exactness-primitives.txt content, so money-float.sh's
# own embedded self_test() (which checks `src/utils/numberUtils.ts` by name)
# keeps passing under this override, PLUS our fixture primitive declared by
# absolute path — whole-line, per-file (E16), not a directory.
{
  [ -f "$REAL_PRIMITIVES" ] && cat "$REAL_PRIMITIVES"
  printf '%s\n' "$TMP/domainA/money-float-primitive.ts"
} > "$TMP/primitives-list.txt"

run_report() {
  MONEY_FLOAT_DOMAIN_LIST="$TMP/domain-list.txt" \
  MONEY_FLOAT_PRIMITIVES="$TMP/primitives-list.txt" \
  GUARD_MODE=report \
  bash "$GUARD"
}

run_ratchet() {
  # $1 = baseline file
  MONEY_FLOAT_DOMAIN_LIST="$TMP/domain-list.txt" \
  MONEY_FLOAT_PRIMITIVES="$TMP/primitives-list.txt" \
  MONEY_FLOAT_BASELINE="$1" \
  bash "$GUARD" --ratchet
}

FAIL=0

# --- case 1: detector alive — a known finding in a declared Domain A fixture
# must be COUNTED. The fixture has exactly two float entry points
# (parseFloat, Math.round) on two separate lines.
REPORT_OUT="$(run_report 2>&1)"
POSITIVE_COUNT="$(printf '%s\n' "$REPORT_OUT" | grep -c "^\[money-float\] .*money-float-positive\.ts:" || true)"
if [ "$POSITIVE_COUNT" != "5" ]; then
  echo "!! self-test BAŞARISIZ [case 1: dedektör]: money-float-positive.ts için 5 bulgu bekleniyordu, $POSITIVE_COUNT bulundu"
  echo "$REPORT_OUT"
  FAIL=1
fi

# --- case 2: exemption applied — the primitive fixture has a real finding
# (`Number(canonical)`) but is declared in the primitives list; it must NOT
# be counted at all (not filtered from a positive count — never scanned).
PRIMITIVE_COUNT="$(printf '%s\n' "$REPORT_OUT" | grep -c "^\[money-float\] .*money-float-primitive\.ts:" || true)"
if [ "$PRIMITIVE_COUNT" != "0" ]; then
  echo "!! self-test BAŞARISIZ [case 2: muafiyet]: money-float-primitive.ts muaf olmalıydı, $PRIMITIVE_COUNT bulgu sayıldı"
  FAIL=1
fi

# --- case 3: scope — the domain-b fixture has a real finding (`toFixed`) and
# sits on disk, but its directory is named nowhere in domain-list.txt. It
# must never appear in the scan, at all.
DOMAINB_COUNT="$(printf '%s\n' "$REPORT_OUT" | grep -c "^\[money-float\] .*money-float-domain-b\.ts:" || true)"
if [ "$DOMAINB_COUNT" != "0" ]; then
  echo "!! self-test BAŞARISIZ [case 3: kapsam]: money-float-domain-b.ts taranmamalıydı, $DOMAINB_COUNT bulgu sayıldı"
  FAIL=1
fi

# --- case 4: ratchet, baseline == current → exit 0.
printf '%s 5\n' "$TMP/domainA/money-float-positive.ts" > "$TMP/baseline-equal.txt"
if run_ratchet "$TMP/baseline-equal.txt" >"$TMP/ratchet-equal.out" 2>&1; then
  :
else
  echo "!! self-test BAŞARISIZ [case 4: taban eşit]: --ratchet exit 0 vermeliydi"
  cat "$TMP/ratchet-equal.out"
  FAIL=1
fi

# --- case 5: ratchet, baseline < current → exit 1 ("bir ratchet fail
# edemiyorsa ratchet değildir" — backend self-test.sh'nin kendi gerekçesi).
printf '%s 4\n' "$TMP/domainA/money-float-positive.ts" > "$TMP/baseline-under.txt"
if run_ratchet "$TMP/baseline-under.txt" >"$TMP/ratchet-under.out" 2>&1; then
  echo "!! self-test BAŞARISIZ [case 5: taban aşıldı]: --ratchet bir artışı (1 -> 2) kabul etti, exit 0 döndü"
  cat "$TMP/ratchet-under.out"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  {
    echo "!!"
    echo "!! money-float self-test'i kendi beklenen matrisini geçemedi. Bu, kaynak"
    echo "!! kodun temiz olduğu anlamına GELMEZ — guard'ın ölçüm yaptığı anlamına"
    echo "!! gelmez (ADR 0007 E15/E16). Beklentiyi değiştirmeden önce başlıktaki"
    echo "!! iki vakayı oku."
  } >&2
  exit 1
fi

echo "-- [money-float] self-test: 5/5 vaka tuttu (dedektör, muafiyet, kapsam, taban-eşit, taban-aşıldı)"
exit 0
