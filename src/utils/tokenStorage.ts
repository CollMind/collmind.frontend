/**
 * Token Storage Utility
 * 
 * Güvenli token saklama için utility fonksiyonları.
 * localStorage ve sessionStorage desteği ile birlikte
 * gelecekte encryption desteği eklenebilir.
 */

export type StorageType = 'localStorage' | 'sessionStorage';

interface TokenStorageOptions {
  storageType?: StorageType;
  encrypt?: boolean; // Gelecekte encryption desteği için
}

const DEFAULT_STORAGE_TYPE: StorageType = 'localStorage';

/**
 * Storage helper - Seçilen storage tipine göre işlem yapar
 */
function getStorage(storageType: StorageType = DEFAULT_STORAGE_TYPE): Storage {
  return storageType === 'sessionStorage' ? sessionStorage : localStorage;
}

/**
 * Access token'ı saklar
 * 
 * @param token - Access token
 * @param options - Storage seçenekleri
 */
export function setAccessToken(
  token: string,
  options: TokenStorageOptions = {}
): void {
  try {
    const storage = getStorage(options.storageType);
    storage.setItem('accessToken', token);
  } catch (error) {
    console.error('Access token saklanamadı:', error);
    throw error;
  }
}

/**
 * Access token'ı alır
 * 
 * @param options - Storage seçenekleri
 * @returns Access token veya null
 */
export function getAccessToken(
  options: TokenStorageOptions = {}
): string | null {
  try {
    const storage = getStorage(options.storageType);
    return storage.getItem('accessToken');
  } catch (error) {
    console.error('Access token alınamadı:', error);
    return null;
  }
}

/**
 * Refresh token'ı saklar
 * 
 * @param token - Refresh token
 * @param options - Storage seçenekleri
 */
export function setRefreshToken(
  token: string,
  options: TokenStorageOptions = {}
): void {
  try {
    const storage = getStorage(options.storageType);
    storage.setItem('refreshToken', token);
  } catch (error) {
    console.error('Refresh token saklanamadı:', error);
    throw error;
  }
}

/**
 * Refresh token'ı alır
 * 
 * @param options - Storage seçenekleri
 * @returns Refresh token veya null
 */
export function getRefreshToken(
  options: TokenStorageOptions = {}
): string | null {
  try {
    const storage = getStorage(options.storageType);
    return storage.getItem('refreshToken');
  } catch (error) {
    console.error('Refresh token alınamadı:', error);
    return null;
  }
}

/**
 * Kullanıcı bilgilerini saklar
 * 
 * @param user - Kullanıcı objesi
 * @param options - Storage seçenekleri
 */
export function setUser(
  user: any,
  options: TokenStorageOptions = {}
): void {
  try {
    const storage = getStorage(options.storageType);
    storage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Kullanıcı bilgileri saklanamadı:', error);
    throw error;
  }
}

/**
 * Kullanıcı bilgilerini alır
 * 
 * @param options - Storage seçenekleri
 * @returns Kullanıcı objesi veya null
 */
export function getUser(options: TokenStorageOptions = {}): any | null {
  try {
    const storage = getStorage(options.storageType);
    const userStr = storage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı bilgileri alınamadı:', error);
    return null;
  }
}

/**
 * Tüm token'ları ve kullanıcı bilgilerini temizler
 * 
 * @param options - Storage seçenekleri
 */
export function clearTokens(options: TokenStorageOptions = {}): void {
  try {
    const storage = getStorage(options.storageType);
    storage.removeItem('accessToken');
    storage.removeItem('refreshToken');
    storage.removeItem('user');
  } catch (error) {
    console.error('Tokenlar temizlenemedi:', error);
  }
}

/**
 * Token'ların varlığını kontrol eder
 * 
 * @param options - Storage seçenekleri
 * @returns Token'lar mevcutsa true
 */
export function hasTokens(options: TokenStorageOptions = {}): boolean {
  const accessToken = getAccessToken(options);
  const refreshToken = getRefreshToken(options);
  return !!(accessToken && refreshToken);
}

/**
 * Token'ları ve kullanıcı bilgilerini toplu olarak saklar
 * 
 * @param data - Token ve kullanıcı bilgileri
 * @param options - Storage seçenekleri
 */
export function setAuthData(
  data: {
    accessToken: string;
    refreshToken: string;
    user: any;
  },
  options: TokenStorageOptions = {}
): void {
  setAccessToken(data.accessToken, options);
  setRefreshToken(data.refreshToken, options);
  setUser(data.user, options);
}

/**
 * Tüm auth verilerini alır
 * 
 * @param options - Storage seçenekleri
 * @returns Auth verileri
 */
export function getAuthData(options: TokenStorageOptions = {}) {
  return {
    accessToken: getAccessToken(options),
    refreshToken: getRefreshToken(options),
    user: getUser(options),
  };
}
