/**
 * IP adresi utility fonksiyonları
 *
 * Client-side IP adresi tespiti için kullanılır.
 * Not: Gerçek IP adresi sadece backend'den alınabilir, bu fonksiyon
 * yaklaşık bir değer döndürür veya opsiyonel olarak backend'den alınabilir.
 */

/**
 * IP adresini almak için kullanılır
 * Öncelikle localStorage'dan kontrol eder, yoksa external servis kullanır
 *
 * @returns Promise<string | undefined> IP adresi veya undefined
 */
export async function getClientIPAddress(): Promise<string | undefined> {
  try {
    // Önce localStorage'dan kontrol et (cache)
    const cachedIP = localStorage.getItem('clientIP');
    if (cachedIP) {
      return cachedIP;
    }

    // External servis kullanarak IP adresini al
    // Not: Production'da backend'den alınması önerilir
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const ip = data.ip;

      // Cache'e kaydet (1 saat geçerli)
      if (ip) {
        localStorage.setItem('clientIP', ip);
        // 1 saat sonra cache'i temizle
        setTimeout(
          () => {
            localStorage.removeItem('clientIP');
          },
          60 * 60 * 1000
        );
      }

      return ip;
    }
  } catch (error) {
    console.warn('IP adresi alınamadı:', error);
    // Hata durumunda undefined döndür (opsiyonel alan)
    return undefined;
  }

  return undefined;
}

/**
 * IP adresi cache'ini temizler
 */
export function clearIPCache(): void {
  localStorage.removeItem('clientIP');
}
