import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { UserRole } from '@/types/user.types';

// T-211 (final Done şartı) — çapraz-repo ROL ENUM sözleşmesi.
//
// Kanonik kayıt: `docs/brd-v2/EK_C_VERI_SOZLUGU.md
// § 📌 Rol değer kümesi — KANONİK KAYIT`. O kayıt iki dosyanın ona atıf
// verdiğini söylüyor — `collmind.backend/src/database/entities/user.entity.ts`
// ve `collmind.frontend/src/types/user.types.ts` — ve "iki repo ayrı CI
// olduğu için kod düzeyinde bağımlılık kurulamaz, senkronu koruyan şey bu
// kayıttır" diyor.
//
// ⛔ REDDEDİLEN TASARIM: testin gövdesine elle yazılmış statik bir
// `['ADMIN', 'PLANNER', ...]` dizisi. O dizi bayatlar (bir rol eklenir/
// silinir, dizi güncellenmez) ve bayatladığında test YEŞİL KALIR — `F1`'in
// altıncı yüzü olurdu (bkz. CLAUDE.md §2.7 doğrulama-maskeleme ailesi).
//
// Bunun yerine bu test ÜÇ bağımsız kaynağı DOSYADAN okur (hiçbiri kopya
// değil, hiçbiri elle bakım gerektirmez):
//
//   1. `canonicalFromDoc`  — EK_C'nin kanonik satırı (insan-okunur kayıt)
//   2. `backendRoles`      — `user.entity.ts`'teki GERÇEK `UserRole` enum
//                            bloğu, regex ile ayrıştırılmış (kopyalanmamış)
//   3. `frontendRoles`     — bu reponun GERÇEK `UserRole` enum'u
//                            (`Object.values`, doğrudan import — kopya değil)
//
// Neden backend dosyası doğrudan okunuyor (yalnız EK_C'ye değil)?
// Çünkü kabul şartı budur: "Backend `user.entity.ts`'e
// `ADMIN = 'YÖNETİCİ'` mutasyonu uygulandığında test KIRMIZIYA DÖNMELİDİR."
// EK_C'nin metni bir mutasyonla değişmez — statik bir markdown dosyasıdır.
// Eğer bu test yalnız frontend'i EK_C'nin metnine karşı sınasaydı, backend
// mutasyonu HİÇBİR ZAMAN görünmezdi (iki repo ayrı CI, aralarında gerçek
// bir kod bağımlılığı yok). Kırmızıya dönmesi gereken şey budur, o yüzden
// test doğrudan backend'in KAYNAK DOSYASINI okur — `collmind.backend`'in bu
// checkout'ta `collmind.frontend`'in kardeş dizini olduğu varsayımıyla
// (bkz. aşağıdaki `readCrossRepoFile` — bu varsayım yanlışsa test SESSİZCE
// atlanmaz, açık bir hata fırlatır; §2.5 sessiz sıfır yasağı).
//
// Üç kaynağın birbirine göre rolü:
//   - `canonicalFromDoc` ↔ `backendRoles`  : backend GERÇEKTEN EK_C'ye uyuyor mu?
//   - `backendRoles` ↔ `frontendRoles`     : iki repo birbirine uyuyor mu?
//                                             (kabul şartının doğrudan sınadığı çift)
//
// İKİ YÖNLÜ assert (EK_C'nin açıkça istediği şekilde): her çift için hem
// "eksik yok" (⊇) hem "fazla yok" (⊆) ayrı ayrı sınanır — yalnız "eksik yok"
// sınansaydı sessizce EKLENEN bir değer (backend mutasyonundaki `YÖNETİCİ`
// gibi) görünmezdi.

const here = dirname(fileURLToPath(import.meta.url));

// `tests/contracts/` -> `tests/` -> `collmind.frontend/` -> repo kökü
// (`Collmind-TPM/`). `collmind.backend/` ve `docs/` oradan kardeş.
const REPO_ROOT = resolve(here, '../../../');
const BACKEND_ENTITY_PATH = resolve(
  REPO_ROOT,
  'collmind.backend/src/database/entities/user.entity.ts',
);
const CANONICAL_DOC_PATH = resolve(
  REPO_ROOT,
  'docs/brd-v2/EK_C_VERI_SOZLUGU.md',
);

function readCrossRepoFile(path: string, label: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch (err) {
    // Sessiz atlama YOK (§2.5). Bu test yalnız bu iki submodule'ün kardeş
    // dizinlerde checkout edildiği bir çalışma ağacında (bu monorepo)
    // koşabilir. Path bulunamıyorsa bunu açık bir hata olarak bildir —
    // testi "skip" etmek, tam da bu task'ın kapatmaya çalıştığı kör noktayı
    // (dört kapı da yeşil) yeniden açar.
    throw new Error(
      `roleEnumContract: ${label} okunamadı (${path}). Bu test iki repoyu ` +
        `kardeş dizin olarak varsayar (collmind.backend ve collmind.frontend ` +
        `aynı kökün altında). Ayrı checkout'larda çalışan bir CI'da bu path ` +
        `mevcut değilse, bu test o CI için geçerli bir mekanizma DEĞİLDİR — ` +
        `sessizce atlanmamalı, koşulamıyor olması ayrıca raporlanmalıdır. ` +
        `Orijinal hata: ${String(err)}`,
    );
  }
}

/**
 * `export enum <enumName> { KEY = 'VALUE', ... }` bloğunu kaynak metninden
 * çıkarır ve yalnız TEL DEĞERLERİNİ (sağ taraftaki string literaller) döner
 * — TS enum KEY'leri değil, çünkü çapraz-repo sözleşmesi tel değeri
 * üzerinden kurulur (JWT/API'de taşınan budur).
 *
 * Yorumlardaki sahte eşleşmeleri önlemek için yalnız SATIR BAŞINDAKİ
 * `KEY = '...'` deseni aranır (bkz. bu dosyadaki `^\s*[A-Z_]+\s*=\s*'...'`
 * — `user.entity.ts`'in JSDoc'unda literal olarak `ADMIN = 'ADMIN'` geçen
 * örnek cümleler var, ama onlar `export enum UserRole {` başlangıcından
 * ÖNCE, yani bu fonksiyonun aradığı blok dışında kalıyor).
 */
function extractEnumWireValues(source: string, enumName: string): string[] {
  const startMarker = `export enum ${enumName} {`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(
      `roleEnumContract: "${startMarker}" kaynak metinde bulunamadı — enum ` +
        `adı ya da bildirim şekli değişmiş olabilir, ayrıştırıcı güncellenmeli.`,
    );
  }
  const bodyStart = startIdx + startMarker.length;
  const bodyEnd = source.indexOf('\n}', bodyStart);
  if (bodyEnd === -1) {
    throw new Error(
      `roleEnumContract: "${enumName}" enum bloğunun kapanışı ("\\n}") bulunamadı.`,
    );
  }
  const body = source.slice(bodyStart, bodyEnd);

  const values: string[] = [];
  const pattern = /^\s*[A-Z_][A-Z0-9_]*\s*=\s*'([^']*)'/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    values.push(match[1]);
  }

  if (values.length === 0) {
    throw new Error(
      `roleEnumContract: "${enumName}" bloğu bulundu ama içinden hiç ` +
        `KEY = 'VALUE' çifti çıkarılamadı — desen bayatlamış olabilir.\n` +
        `Blok içeriği:\n${body}`,
    );
  }

  return values;
}

/**
 * EK_C'nin "📌 Rol değer kümesi — KANONİK KAYIT" başlığından hemen sonraki
 * ilk kod bloğunu (```...```) okur ve `·` ile ayrılmış tokenleri döner.
 */
function extractCanonicalRolesFromDoc(source: string): string[] {
  const headingMarker = 'Rol değer kümesi — KANONİK KAYIT';
  const headingIdx = source.indexOf(headingMarker);
  if (headingIdx === -1) {
    throw new Error(
      `roleEnumContract: EK_C'de "${headingMarker}" başlığı bulunamadı — ` +
        `kayıt yeniden adlandırılmış/taşınmış olabilir, ayrıştırıcı güncellenmeli.`,
    );
  }
  const fenceStart = source.indexOf('```', headingIdx);
  if (fenceStart === -1) {
    throw new Error(
      'roleEnumContract: KANONİK KAYIT başlığından sonra kod bloğu (```) bulunamadı.',
    );
  }
  const contentStart = source.indexOf('\n', fenceStart) + 1;
  const fenceEnd = source.indexOf('```', contentStart);
  if (fenceEnd === -1) {
    throw new Error('roleEnumContract: kanonik kod bloğu kapanmıyor.');
  }
  const content = source.slice(contentStart, fenceEnd).trim();
  const tokens = content
    .split('·')
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error(
      `roleEnumContract: kanonik kod bloğu boş ayrıştırıldı. Ham içerik: ${JSON.stringify(content)}`,
    );
  }

  return tokens;
}

/**
 * İKİ YÖNLÜ karşılaştırma: `actual` kümesinin `expected` kümesine göre hem
 * eksiklerini hem fazlalarını ayrı ayrı raporlar. Tek bir `toEqual` yerine
 * bunu kullanmamızın sebebi: bir yön kırıldığında (yalnız eksik ya da yalnız
 * fazla) hata mesajının HANGİ yönün kırıldığını söylemesi — EK_C'nin
 * özellikle uyardığı "fazlalık sessizce kaçar" riskini test raporunda da
 * görünür kılmak için.
 */
function assertSameSet(actual: string[], expected: string[], label: string) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);

  const missing = [...expectedSet].filter((v) => !actualSet.has(v)); // ⊇ ihlali
  const extra = [...actualSet].filter((v) => !expectedSet.has(v)); // ⊆ ihlali

  expect(missing, `${label}: eksik değer(ler) (⊇ ihlali)`).toEqual([]);
  expect(extra, `${label}: fazla değer(ler) (⊆ ihlali)`).toEqual([]);
}

describe('T-211 · çapraz-repo ROL ENUM sözleşmesi (EK_C_VERI_SOZLUGU.md § Rol değer kümesi)', () => {
  const canonicalFromDoc = extractCanonicalRolesFromDoc(
    readCrossRepoFile(CANONICAL_DOC_PATH, 'EK_C_VERI_SOZLUGU.md'),
  );
  const backendRoles = extractEnumWireValues(
    readCrossRepoFile(BACKEND_ENTITY_PATH, 'collmind.backend user.entity.ts'),
    'UserRole',
  );
  const frontendRoles = Object.values(UserRole);

  it('kanonik kayıt (EK_C) hâlâ ayrıştırılabiliyor ve boş değil', () => {
    expect(canonicalFromDoc.length).toBeGreaterThan(0);
  });

  it('backend UserRole tel değerleri EK_C kanonik kümesiyle birebir eşleşiyor (iki yönlü)', () => {
    assertSameSet(backendRoles, canonicalFromDoc, 'backend ↔ EK_C kanonik küme');
  });

  it(
    'frontend UserRole tel değerleri backend UserRole tel değerleriyle birebir eşleşiyor ' +
      '(iki yönlü — bu, kabul şartının doğrudan sınadığı çift: backend user.entity.ts\'e ' +
      "ADMIN = 'YÖNETİCİ' mutasyonu uygulandığında bu assertion kırmızıya döner)",
    () => {
      assertSameSet(frontendRoles, backendRoles, 'frontend ↔ backend UserRole');
    },
  );

  it('frontend UserRole tel değerleri EK_C kanonik kümesiyle birebir eşleşiyor (iki yönlü)', () => {
    assertSameSet(frontendRoles, canonicalFromDoc, 'frontend ↔ EK_C kanonik küme');
  });
});
