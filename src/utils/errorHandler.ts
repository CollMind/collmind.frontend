/**
 * Error Handler Utilities
 * 
 * API hatalarını kullanıcı dostu mesajlara dönüştürmek için utility fonksiyonları
 */

export interface ApiError {
  message: string;
  statusCode?: number;
  isNetworkError?: boolean;
  originalError?: any;
}

/**
 * API hatasını kullanıcı dostu mesaja dönüştürür
 * 
 * @param error - Axios error veya genel error
 * @returns Kullanıcı dostu hata mesajı
 */
export function getErrorMessage(error: any): string {
  // Network error - isNetworkError flag'i varsa veya response yoksa
  if (error.isNetworkError) {
    return 'Ağ bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
  }

  // Response yoksa ve message varsa, message'ı döndür
  if (!error.response) {
    // Eğer error.message varsa onu döndür, yoksa network error mesajı
    return error.message || 'Ağ bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
  }

  // Server'dan gelen mesaj
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Status code'a göre genel mesajlar
  const status = error.response?.status;
  switch (status) {
    case 400:
      return 'Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.';
    case 401:
      return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
    case 403:
      return 'Bu işlem için yetkiniz bulunmamaktadır.';
    case 404:
      return 'İstenen kaynak bulunamadı.';
    case 500:
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    case 503:
      return 'Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
    default:
      return error.message || 'Beklenmeyen bir hata oluştu.';
  }
}

/**
 * Error'u loglar (development ortamında)
 * 
 * @param error - Loglanacak error
 * @param context - Hatanın oluştuğu context (opsiyonel)
 */
export function logError(error: any, context?: string): void {
  if (import.meta.env.DEV) {
    console.error('Error:', {
      context,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Production'da error tracking servisine gönderilebilir (Sentry, LogRocket, vb.)
  // if (import.meta.env.PROD) {
  //   errorTrackingService.log(error, context);
  // }
}

/**
 * Admin kısıtlama hatalarını handle eder
 */
export const handleAdminRestrictionError = (error: any): string => {
  const message = error.response?.data?.message || error.message;

  if (message.includes('cannot approve')) {
    return 'Admin kullanıcıları kendi oluşturdukları rezervasyonları onaylayamaz.';
  }

  if (message.includes('cannot create agreements')) {
    return 'Admin kullanıcıları anlaşma oluşturamaz. Lütfen Planner rolünü kullanın.';
  }

  if (message.includes('cannot commit budget')) {
    return 'Admin kullanıcıları budget commit edemez. Finance rolü gereklidir.';
  }

  if (message.includes('cannot modify their own role')) {
    return 'Admin kullanıcıları kendi rol izinlerini değiştiremez.';
  }

  return message || 'Bir hata oluştu';
};


