import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getErrorMessage, logError } from '@/utils/errorHandler';

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getErrorMessage', () => {
    it('should return network error message for network errors', () => {
      const error = {
        isNetworkError: true,
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Ağ bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
    });

    it('should return network error message when no response', () => {
      const error = {
        message: 'Network Error',
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Ağ bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
    });

    it('should return server message when available', () => {
      const error = {
        response: {
          data: {
            message: 'Custom server error message',
          },
        },
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Custom server error message');
    });

    it('should return appropriate message for 400 status', () => {
      const error = {
        response: {
          status: 400,
        },
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.');
    });

    it('should return appropriate message for 401 status', () => {
      const error = {
        response: {
          status: 401,
        },
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
    });

    it('should return appropriate message for 403 status', () => {
      const error = {
        response: {
          status: 403,
        },
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Bu işlem için yetkiniz bulunmamaktadır.');
    });

    it('should return appropriate message for 404 status', () => {
      const error = {
        response: {
          status: 404,
        },
      };

      const message = getErrorMessage(error);
      expect(message).toBe('İstenen kaynak bulunamadı.');
    });

    it('should return appropriate message for 500 status', () => {
      const error = {
        response: {
          status: 500,
        },
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.');
    });

    it('should return appropriate message for 503 status', () => {
      const error = {
        response: {
          status: 503,
        },
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    });

    it('should return error message when available', () => {
      const error = {
        message: 'Custom error message',
        response: undefined, // Explicitly set to undefined
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Custom error message');
    });

    it('should return default message for unknown errors', () => {
      const error = {
        response: undefined,
        message: undefined,
      };

      const message = getErrorMessage(error);
      expect(message).toBe('Beklenmeyen bir hata oluştu.');
    });
  });

  describe('logError', () => {
    it('should log error in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalEnv = import.meta.env.DEV;
      
      // @ts-ignore
      import.meta.env.DEV = true;

      const error = {
        message: 'Test error',
        response: {
          status: 500,
          data: { message: 'Server error' },
        },
      };

      logError(error, 'TestContext');

      expect(consoleSpy).toHaveBeenCalledWith('Error:', {
        context: 'TestContext',
        message: 'Test error',
        status: 500,
        data: { message: 'Server error' },
        timestamp: expect.any(String),
      });

      consoleSpy.mockRestore();
      // @ts-ignore
      import.meta.env.DEV = originalEnv;
    });
  });
});
