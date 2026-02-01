import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { store } from '@/store';
import { logout, setCredentials } from '@/store/slices/auth.slice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 saniye timeout
});

// Token refresh queue mekanizması - Concurrent refresh isteklerini önlemek için
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.accessToken;
    const tenantId = store.getState().auth.user?.tenantId;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 403 Forbidden - Yetkisiz erişim
    if (error.response?.status === 403) {
      // 403 hatası için kullanıcıya uygun mesaj göster
      const errorMessage =
        error.response?.data?.message ||
        'Bu işlem için yetkiniz bulunmamaktadır.';
      
      // Log technical error for debugging (kullanıcıya gösterilmez)
      console.error('403 Forbidden Error:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      
      // 403 hatası için logout yapmıyoruz, sadece hata döndürüyoruz
      // Component seviyesinde kullanıcıya uygun mesaj gösterilebilir
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Eğer zaten refresh işlemi devam ediyorsa, isteği queue'ya ekle
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = store.getState().auth.refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Refresh token endpoint'ini doğrudan axios ile çağır (interceptor loop'unu önlemek için)
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { accessToken, refreshToken: newRefreshToken, user } = response.data;
        
        store.dispatch(
          setCredentials({
            user: user || store.getState().auth.user!,
            accessToken,
            refreshToken: newRefreshToken,
          })
        );

        // Queue'daki tüm istekleri yeni token ile işle
        processQueue(null, accessToken);

        // Orijinal isteği yeni token ile tekrar dene
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh başarısız, queue'daki tüm istekleri reddet
        processQueue(refreshError, null);
        
        // Logout yap
        store.dispatch(logout());
        
        // Login sayfasına yönlendir (sadece login sayfasında değilsek ve browser ortamındaysak)
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          // Test ortamında navigation'ı atla
          if (import.meta.env.MODE !== 'test') {
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle Network Errors
    if (!error.response) {
      // Network error (no response from server)
      const networkError = {
        message: 'Ağ bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
        isNetworkError: true,
        originalError: error,
      };
      
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: originalRequest?.url,
        timestamp: new Date().toISOString(),
      });
      
      return Promise.reject(networkError);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      const serverError = {
        message: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
        statusCode: 500,
        originalError: error,
      };
      
      // Log technical error for debugging
      console.error('500 Internal Server Error:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
      
      return Promise.reject(serverError);
    }

    // Handle other errors (400, 404, etc.)
    // Log technical error for debugging
    if (error.response?.status >= 400) {
      console.error('API Error:', {
        status: error.response.status,
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
