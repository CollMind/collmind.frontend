import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getClientIPAddress, clearIPCache } from '@/utils/ipAddress';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';

describe('ipAddress', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearIPCache();
  });

  it('should fetch and cache IP address', async () => {
    const mockIP = '192.168.1.1';
    
    server.use(
      http.get('https://api.ipify.org', () => {
        return HttpResponse.json({ ip: mockIP });
      })
    );

    const ip = await getClientIPAddress();
    expect(ip).toBe(mockIP);
    expect(localStorage.getItem('clientIP')).toBe(mockIP);
  });

  it('should return cached IP address if available', async () => {
    const cachedIP = '192.168.1.100';
    localStorage.setItem('clientIP', cachedIP);

    const ip = await getClientIPAddress();
    expect(ip).toBe(cachedIP);
  });

  it('should return undefined on error', async () => {
    server.use(
      http.get('https://api.ipify.org', () => {
        return HttpResponse.json({ error: 'Failed' }, { status: 500 });
      })
    );

    const ip = await getClientIPAddress();
    expect(ip).toBeUndefined();
  });

  it('should clear IP cache', () => {
    localStorage.setItem('clientIP', '192.168.1.1');
    clearIPCache();
    expect(localStorage.getItem('clientIP')).toBeNull();
  });
});
