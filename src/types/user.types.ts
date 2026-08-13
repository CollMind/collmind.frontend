/**
 * B dalgası / R2a (backend `user.entity.ts`, migration `1803000000000`) — ⛔ P0
 * düzeltmesi (2026-08-13): backend enum'u ile TEL BİREBİR eşleşmeli. Bir turda backend
 * enum DEĞERLERİ yanlışlıkla Türkçeye taşınmıştı (`ADMIN='YÖNETİCİ'`); bağımsız kontrol
 * bunun `hasRole`'ü (birebir string eşitliği) sessizce kırdığını ölçtü — her rol kapılı
 * rota her kullanıcı için reddediliyordu. Karar geri alındı: enum DEĞERLERİ ASCII kalır.
 *
 * `MANAGER`/`APPROVER`/(eski jenerik) `FINANCE` KALDIRILDI — backend'de 0 kullanıcı
 * (K-2.6.4b, K-2.6.4d). `FINANCE_MANAGER`'ın tel değeri `FINANCE_MANAGER` → `FINANCE`
 * oldu (backend eski jenerik `FINANCE`'ı sildiği için etiketi devraldı). TS enum KEY'i
 * `FINANCE_MANAGER` olarak KALDI — yalnız taşıdığı string değişti.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PLANNER = 'PLANNER',
  CATEGORY_MANAGER = 'CATEGORY_MANAGER',
  FINANCE_MANAGER = 'FINANCE', // ⚠️ tek ad değişikliği — bkz. üst yorum
  READONLY = 'READONLY', // Read-only access — all GET endpoints, no write
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
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
