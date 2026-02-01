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

  http.get(`${API_BASE_URL}/users/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      email: 'user@example.com',
      fullName: 'Test User',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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

  http.post(`${API_BASE_URL}/users`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: '2',
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      status: body.status || 'ACTIVE',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/users/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.id as string,
      email: 'user@example.com',
      fullName: body.fullName || 'Test User',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-1',
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.patch(`${API_BASE_URL}/users/me`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      fullName: body.fullName || 'Test User',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-1',
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.patch(`${API_BASE_URL}/users/:id/password`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${API_BASE_URL}/users/me/password`, async ({ request }) => {
    const body = await request.json() as any;
    if (body.currentPassword === 'wrong-password') {
      return HttpResponse.json(
        { message: 'Mevcut şifre hatalı' },
        { status: 400 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/users/:id/activate`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      email: 'user@example.com',
      fullName: 'Test User',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/users/:id/deactivate`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      email: 'user@example.com',
      fullName: 'Test User',
      role: 'ADMIN',
      status: 'INACTIVE',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete(`${API_BASE_URL}/users/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Customer handlers
  http.get(`${API_BASE_URL}/customers`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const channel = url.searchParams.get('channel');
    const status = url.searchParams.get('status');
    
    const customers = [
      {
        id: '1',
        code: 'CUST001',
        name: 'Test Customer 1',
        channel: 'RETAIL',
        type: 'DIRECT',
        status: 'ACTIVE',
        city: 'İstanbul',
        isVip: false,
        numberOfBranches: 5,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        code: 'CUST002',
        name: 'Test Customer 2',
        channel: 'WHOLESALE',
        type: 'DISTRIBUTOR',
        status: 'INACTIVE',
        city: 'Ankara',
        isVip: true,
        numberOfBranches: 10,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    let filtered = customers;
    if (search) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (channel) {
      filtered = filtered.filter(c => c.channel === channel);
    }
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    return HttpResponse.json(filtered);
  }),

  http.get(`${API_BASE_URL}/customers/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'CUST001',
      name: 'Test Customer',
      channel: 'RETAIL',
      type: 'DIRECT',
      status: 'ACTIVE',
      city: 'İstanbul',
      district: 'Kadıköy',
      region: 'Marmara',
      country: 'Türkiye',
      contactPerson: 'John Doe',
      contactEmail: 'contact@example.com',
      contactPhone: '02121234567',
      isVip: false,
      numberOfBranches: 5,
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE_URL}/customers/code/:code`, ({ params }) => {
    return HttpResponse.json({
      id: '1',
      code: params.code as string,
      name: 'Test Customer',
      channel: 'RETAIL',
      type: 'DIRECT',
      status: 'ACTIVE',
      isVip: false,
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE_URL}/customers/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    return HttpResponse.json([
      {
        id: '1',
        code: 'CUST001',
        name: `Search Result ${q}`,
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

  http.get(`${API_BASE_URL}/customers/channel/:channel`, ({ params }) => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'CUST001',
        name: 'Test Customer',
        channel: params.channel as string,
        type: 'DIRECT',
        status: 'ACTIVE',
        isVip: false,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/customers/city/:city`, ({ params }) => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'CUST001',
        name: 'Test Customer',
        channel: 'RETAIL',
        type: 'DIRECT',
        status: 'ACTIVE',
        city: params.city as string,
        isVip: false,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/customers/vip`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'CUST001',
        name: 'VIP Customer',
        channel: 'RETAIL',
        type: 'DIRECT',
        status: 'ACTIVE',
        isVip: true,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/customers/:id/stats`, ({ params }) => {
    return HttpResponse.json({
      totalOrders: 100,
      totalRevenue: 50000,
      lastOrderDate: new Date().toISOString(),
      averageOrderValue: 500,
    });
  }),

  http.post(`${API_BASE_URL}/customers`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: '3',
      code: body.code,
      name: body.name,
      channel: body.channel,
      type: body.type || 'DIRECT',
      status: body.status || 'ACTIVE',
      isVip: body.isVip || false,
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/customers/bulk`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json(
      body.customers.map((c: any, index: number) => ({
        id: `${index + 1}`,
        ...c,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      { status: 201 }
    );
  }),

  http.patch(`${API_BASE_URL}/customers/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.id as string,
      code: 'CUST001',
      name: 'Test Customer',
      channel: 'RETAIL',
      type: 'DIRECT',
      status: 'ACTIVE',
      isVip: false,
      tenantId: 'tenant-1',
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete(`${API_BASE_URL}/customers/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/customers/:id/activate`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'CUST001',
      name: 'Test Customer',
      channel: 'RETAIL',
      type: 'DIRECT',
      status: 'ACTIVE',
      isVip: false,
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/customers/:id/deactivate`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'CUST001',
      name: 'Test Customer',
      channel: 'RETAIL',
      type: 'DIRECT',
      status: 'INACTIVE',
      isVip: false,
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/customers/import`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return HttpResponse.json(
        { message: 'Dosya bulunamadı' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      total: 10,
      created: 8,
      skipped: 2,
      errors: [
        {
          row: 3,
          code: 'CUST003',
          error_type: 'ALREADY_EXISTS',
          error_message: 'Müşteri kodu zaten mevcut',
        },
        {
          row: 7,
          code: 'CUST007',
          error_type: 'MISSING_FIELD',
          error_message: 'Name alanı zorunludur',
        },
      ],
    }, { status: 201 });
  }),
];

