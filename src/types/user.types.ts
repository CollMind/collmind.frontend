/**
 * B dalgası / R2a (backend `user.entity.ts`, migration `1803000000000`) — ⛔ P0
 * düzeltmesi (2026-08-13): backend enum'u ile TEL BİREBİR eşleşmeli. Bir turda backend
 * enum DEĞERLERİ yanlışlıkla Türkçeye taşınmıştı (`ADMIN='YÖNETİCİ'`); bağımsız kontrol
 * bunun `hasRole`'ü (birebir string eşitliği) sessizce kırdığını ölçtü — her rol kapılı
 * rota her kullanıcı için reddediliyordu. Karar geri alındı: enum DEĞERLERİ ASCII kalır.
 *
 * `MANAGER`/`APPROVER`/(eski jenerik) `FINANCE` KALDIRILDI — backend'de 0 kullanıcı
 * (K-2.6.4b, K-2.6.4d). Tel değeri `FINANCE_MANAGER` → `FINANCE` oldu (backend eski
 * jenerik `FINANCE`'ı sildiği için etiketi devraldı). O turda TS enum KEY'i
 * `FINANCE_MANAGER` olarak KALMIŞTI — yalnız taşıdığı string değişmişti.
 *
 * `Z7` (`docs/brd-v2/04_KARAR_KAYDI.md`, 2026-08-17, ADIM 3 Faz A) — backend
 * (`1d10cd2`) TS enum KEY'ini de değiştirdi: `UserRole.FINANCE_MANAGER` →
 * `UserRole.FINANCE`, DEĞER `'FINANCE'` DEĞİŞMEDİ. Gerekçe: anahtar (`FINANCE_MANAGER`)
 * ile değer (`'FINANCE'`) AYRIŞIYORDU — `EK_C`'nin uyardığı "ad benzerliği ile anlam
 * ayrışması" sınıfı. Bu dosya aynı turda, aynı gerekçeyle uyumlandı (tel DEĞERİ
 * DEĞİŞMEDİ — yalnız sol taraftaki TS tanımlayıcısı).
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PLANNER = 'PLANNER',
  CATEGORY_MANAGER = 'CATEGORY_MANAGER',
  FINANCE = 'FINANCE', // Z7: TS key FINANCE_MANAGER → FINANCE (değer değişmedi, key=değer artık eşleşiyor)
  READONLY = 'READONLY', // Read-only access — all GET endpoints, no write
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
}

/**
 * T-243 — istemci tarafı ergonomi kararı, sözleşme kaynağı DEĞİL.
 *
 * Kaynak — backend `user-scope.entity.ts` (`WILDCARD_SCOPE_ROLES` /
 * `SCOPE_REQUIRED_ROLES`, T-241 karar (b)). Backend'in dört kapısı
 * (B1/R1/A3/R2, `user.service.ts`) bu listeden BAĞIMSIZ olarak çalışmaya
 * devam eder — bu iki set yalnız `UserForm`'un hangi alanları
 * gösterdiğini/zorunlu kıldığını belirler. İki liste birbirinden ayrı
 * güncellenirse (backend'e yeni bir rol eklenir, burası unutulursa)
 * sonuç bir güvenlik açığı DEĞİL, bir ergonomi gerilemesidir: istemci
 * yanlış alanı gösterir/gizler, backend yine de doğru 400/409'u döner.
 */
export const SCOPE_REQUIRED_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.PLANNER,
  UserRole.CATEGORY_MANAGER,
]);

export const WILDCARD_SCOPE_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.READONLY,
]);

/**
 * T-241 — backend `UserScopePairDto` (`create-user.dto.ts`) ile alan
 * adları BİREBİR. `null` = o boyutta "hepsi"; `undefined` = kullanıcı
 * henüz seçim yapmadı (istemci-yalnız ara durum, backend'e hiç gönderilmez
 * — bkz. `UserForm.tsx`'in gönderim öncesi normalizasyonu).
 */
export interface UserScopePair {
  cplId?: string | null;
  categoryId?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  tenantId: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status?: UserStatus;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  mustChangePassword?: boolean;
  permissions?: string[];
  /**
   * `SCOPE_REQUIRED_ROLES` (PLANNER/CATEGORY_MANAGER) için ZORUNLU (≥1
   * çift). `WILDCARD_SCOPE_ROLES` (ADMIN/FINANCE/READONLY) için bu alan
   * HİÇ GÖNDERİLMEMELİDİR — backend `A3` kapısı, verilirse 400 döner
   * (`user.service.ts` `resolveScopeRowsToWrite`).
   */
  scope?: UserScopePair[];
}

export interface UpdateUserDto {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
}

export interface ChangePasswordDto {
  currentPassword?: string; // Optional for admin changing user's password
  newPassword: string;
}
