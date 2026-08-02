import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { store } from '@/store';
import { logout, setCredentials } from '@/store/slices/auth.slice';
import { addNotification } from '@/store/slices/ui.slice';
import { getErrorMessage } from '@/utils/errorHandler';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV || import.meta.env.MODE === 'test'
    ? 'http://localhost:3000'
    : '');

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL must be set for production builds.');
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 saniye timeout
});

// Authentication endpoints whose own 401 means "credentials are wrong",
// not "session expired" — they must NOT go through the refresh flow.
// - /auth/login: a failed login already returns 401 for bad credentials.
//   Treating it as an expired-session token would silently swallow the
//   real error behind a misleading "No refresh token" message (T-050).
// - /auth/refresh: exempting only /auth/login isn't enough — if a refresh
//   call itself is ever routed through this interceptor (e.g. via
//   authEndpoints.refresh() called through apiClient) and returns 401, the
//   interceptor would try to refresh a refresh call, risking recursion.
// Matched by pathname (not substring) so a baseURL change or an unrelated
// route that merely contains "/auth/login" can't false-positive here.
const AUTH_EXEMPT_PATHS = new Set(['/auth/login', '/auth/refresh']);

function isAuthExemptRequest(url: string | undefined): boolean {
  if (!url) return false;
  try {
    // Handles both relative ('/auth/login') and absolute URLs by resolving
    // against the configured API base — we only ever compare the pathname.
    const parsed = new URL(url, API_BASE_URL);
    return AUTH_EXEMPT_PATHS.has(parsed.pathname);
  } catch {
    return false;
  }
}

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

    // FormData requests (e.g. file uploads like customer import) must not
    // carry the instance-wide 'Content-Type: application/json' default —
    // it stomps on the multipart boundary the browser/axios would otherwise
    // set automatically, so the server always rejects the upload body as
    // malformed. Removing the header here lets axios set the correct
    // 'multipart/form-data; boundary=...' value itself (found via T-040:
    // useCustomerImport's "happy path" test was actually hitting a 500).
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
      const errorMessage = getErrorMessage(error);

      // Log technical error for debugging
      console.error('403 Forbidden Error:', {
        status: 403,
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });

      // Toast göster
      store.dispatch(
        addNotification({
          type: 'error',
          message: errorMessage,
        })
      );

      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthExemptRequest(originalRequest.url)
    ) {
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

        const {
          accessToken,
          refreshToken: newRefreshToken,
          user,
        } = response.data;

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

        // Toast göster
        const refreshErrorMessage = getErrorMessage(refreshError);
        store.dispatch(
          addNotification({
            type: 'error',
            message:
              refreshErrorMessage ||
              'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          })
        );

        // Logout yap
        store.dispatch(logout());

        // Login sayfasına yönlendir (sadece login sayfasında değilsek ve browser ortamındaysak)
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login'
        ) {
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
      const errorMessage = getErrorMessage(error);
      const networkError = {
        message: errorMessage,
        isNetworkError: true,
        originalError: error,
      };

      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: originalRequest?.url,
        timestamp: new Date().toISOString(),
      });

      // Toast göster
      store.dispatch(
        addNotification({
          type: 'error',
          message: errorMessage,
        })
      );

      return Promise.reject(networkError);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      const errorMessage = getErrorMessage(error);
      const serverError = {
        message: errorMessage,
        statusCode: 500,
        originalError: error,
      };

      // Log technical error for debugging
      const errorData500 = error.response?.data as
        | { message?: string }
        | undefined;
      console.error('500 Internal Server Error:', {
        status: 500,
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: errorData500?.message || error.message,
        timestamp: new Date().toISOString(),
      });

      // Toast göster
      store.dispatch(
        addNotification({
          type: 'error',
          message: errorMessage,
        })
      );

      return Promise.reject(serverError);
    }

    // Handle other errors (400, 404, etc.)
    // 401 hatası için toast göstermiyoruz (logout yapılıyor)
    if (error.response?.status >= 400 && error.response?.status !== 401) {
      const errorMessage = getErrorMessage(error);

      // Log technical error for debugging
      const errorData = error.response?.data as
        | { message?: string }
        | undefined;
      console.error('API Error:', {
        status: error.response.status,
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: errorData?.message || error.message,
        timestamp: new Date().toISOString(),
      });

      // Toast göster
      store.dispatch(
        addNotification({
          type: 'error',
          message: errorMessage,
        })
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
