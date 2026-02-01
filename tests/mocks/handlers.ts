import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://localhost:3000';

export const handlers = [
  // Auth handlers
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Simulate invalid credentials
    if (body.email === 'invalid@example.com') {
      return HttpResponse.json(
        { message: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        email: body.email || 'test@example.com',
        fullName: 'Test User',
        role: 'ADMIN',
        tenantId: 'tenant-1',
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'ADMIN',
        tenantId: 'tenant-1',
      },
    });
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // User handlers
  http.get(`${API_BASE_URL}/users`, () => {
    return HttpResponse.json([
      {
        id: '1',
        email: 'user@example.com',
        fullName: 'Test User',
        role: 'ADMIN',
        status: 'ACTIVE',
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/users/me`, () => {
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // Customer handlers
  http.get(`${API_BASE_URL}/customers`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'CUST001',
        name: 'Test Customer',
        channel: 'RETAIL',
        type: 'DIRECT',
        status: 'ACTIVE',
        isVip: false,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),
];

