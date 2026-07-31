import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://localhost:3000';

export const handlers = [
  // External IP lookup (src/utils/ipAddress.ts calls this directly on
  // login). Without a handler, `server.listen({ onUnhandledRequest: 'error' })`
  // throws for every test that renders the login flow (see T-040).
  http.get('https://api.ipify.org', () => {
    return HttpResponse.json({ ip: '127.0.0.1' });
  }),

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

  // NOTE: msw matches handlers in array order and takes the first match.
  // `/users/me` (and its PATCH/PATCH-password siblings below) must be
  // registered *before* the generic `/users/:id` wildcard handlers, or
  // `:id` greedily matches the literal "me" segment and every `useMe()`-
  // style call gets back `{ id: 'me', ... }` instead of the dedicated
  // "current user" fixture (see T-040).
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

  http.patch(`${API_BASE_URL}/users/:id/password`, () => {
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

  // NOTE: msw matches handlers in array order and takes the first match, so
  // the generic `/customers/:id` wildcard must come *after* every literal
  // sibling route below it (search, channel/:channel, city/:city, vip) —
  // otherwise `:id` greedily captures "search"/"vip"/etc. and returns a
  // single Customer object where callers expect an array (see T-040; this
  // exact bug broke useSearchCustomers()).
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
    // jsdom's FormData/XHR implementation does not reliably reproduce a
    // real browser's automatic multipart Content-Type + boundary for
    // FormData bodies (a jsdom limitation, not an app bug — see the
    // src/api/client.ts fix in T-040 for the real Content-Type defect this
    // uncovered). request.formData() is strict about that header and
    // throws in this test environment even for a well-formed request, so
    // fall back to a presence check on the raw body instead of hard-failing
    // the whole handler.
    let file: File | null = null;
    try {
      const formData = await request.formData();
      file = formData.get('file') as File | null;
    } catch {
      file = request.body ? ({} as File) : null;
    }

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

  // Tenant handlers
  http.get(`${API_BASE_URL}/tenants`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'TENANT001',
        name: 'Test Tenant',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/tenants/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'TENANT001',
      name: 'Test Tenant',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE_URL}/tenants/:id/stats`, () => {
    return HttpResponse.json({
      totalUsers: 10,
      totalCustomers: 50,
      totalAgreements: 20,
      totalPlans: 15,
    });
  }),

  http.post(`${API_BASE_URL}/tenants`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: '2',
      ...body,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/tenants/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.id as string,
      code: 'TENANT001',
      name: 'Test Tenant',
      status: 'ACTIVE',
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete(`${API_BASE_URL}/tenants/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/tenants/:id/activate`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'TENANT001',
      name: 'Test Tenant',
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/tenants/:id/suspend`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'TENANT001',
      name: 'Test Tenant',
      status: 'SUSPENDED',
      updatedAt: new Date().toISOString(),
    });
  }),

  // Agreement handlers
  http.get(`${API_BASE_URL}/agreements`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    return HttpResponse.json([
      {
        id: '1',
        code: 'AGR001',
        name: 'Test Agreement',
        status: status || 'DRAFT',
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/agreements/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'AGR001',
      name: 'Test Agreement',
      status: 'DRAFT',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/agreements`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: '2',
      ...body,
      status: 'DRAFT',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/agreements/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.id as string,
      code: 'AGR001',
      name: 'Test Agreement',
      status: 'DRAFT',
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete(`${API_BASE_URL}/agreements/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/agreements/:id/submit`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'AGR001',
      name: 'Test Agreement',
      status: 'PENDING',
      tenantId: 'tenant-1',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/agreements/:id/approve`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'AGR001',
      name: 'Test Agreement',
      status: 'APPROVED',
      tenantId: 'tenant-1',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/agreements/:id/reject`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'AGR001',
      name: 'Test Agreement',
      status: 'REJECTED',
      tenantId: 'tenant-1',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/agreements/:id/cancel`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'AGR001',
      name: 'Test Agreement',
      status: 'CANCELLED',
      tenantId: 'tenant-1',
      updatedAt: new Date().toISOString(),
    });
  }),

  // Budget handlers
  http.get(`${API_BASE_URL}/budget/envelopes`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'ENV001',
        name: 'Test Envelope',
        allocatedAmount: 100000,
        consumedAmount: 50000,
        reservedAmount: 20000,
        availableAmount: 30000,
        period: '2024-Q1',
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/budget/envelopes/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      code: 'ENV001',
      name: 'Test Envelope',
      allocatedAmount: 100000,
      consumedAmount: 50000,
      reservedAmount: 20000,
      availableAmount: 30000,
      period: '2024-Q1',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/budget/envelopes`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: '2',
      ...body,
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/budget/reserve`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: '1',
      envelopeId: body.envelopeId,
      amount: body.amount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/budget/reservations/:id/approve`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      status: 'APPROVED',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE_URL}/budget/reservations/:id/reject`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      status: 'REJECTED',
      updatedAt: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE_URL}/budget/envelopes/:id/reservations`, () => {
    return HttpResponse.json([
      {
        id: '1',
        envelopeId: '1',
        amount: 10000,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/budget/envelopes/:id/reserved-amount`, () => {
    return HttpResponse.json({
      reservedAmount: 20000,
    });
  }),

  http.get(`${API_BASE_URL}/budget/envelopes/:id/transactions`, () => {
    return HttpResponse.json([
      {
        id: '1',
        envelopeId: '1',
        type: 'RESERVATION',
        amount: 10000,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  // Ledger handlers
  http.get(`${API_BASE_URL}/ledger`, ({ request }) => {
    const url = new URL(request.url);
    const envelopeId = url.searchParams.get('envelopeId');
    return HttpResponse.json([
      {
        id: '1',
        envelopeId: envelopeId || 'envelope-1',
        agreementId: 'agreement-1',
        type: 'RESERVATION',
        amount: 10000,
        description: 'Test entry',
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/ledger/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      envelopeId: 'envelope-1',
      agreementId: 'agreement-1',
      type: 'RESERVATION',
      amount: 10000,
      description: 'Test entry',
      createdAt: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE_URL}/ledger/agreement/:id`, ({ params }) => {
    return HttpResponse.json([
      {
        id: '1',
        envelopeId: 'envelope-1',
        agreementId: params.id as string,
        type: 'RESERVATION',
        amount: 10000,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/ledger/agreement/:id/consumed`, () => {
    return HttpResponse.json({
      consumedAmount: 50000,
    });
  }),

  http.get(`${API_BASE_URL}/ledger/envelope/:id`, ({ params }) => {
    return HttpResponse.json([
      {
        id: '1',
        envelopeId: params.id as string,
        agreementId: 'agreement-1',
        type: 'RESERVATION',
        amount: 10000,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/ledger/envelope/:id/consumed`, () => {
    return HttpResponse.json({
      consumedAmount: 75000,
    });
  }),

  // Notification handlers
  http.get(`${API_BASE_URL}/notifications`, ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    return HttpResponse.json([
      {
        id: '1',
        type: 'AGREEMENT_APPROVED',
        title: 'Anlaşma Onaylandı',
        message: 'Test anlaşması onaylandı',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/notifications/unread`, () => {
    return HttpResponse.json([
      {
        id: '1',
        type: 'AGREEMENT_APPROVED',
        title: 'Anlaşma Onaylandı',
        message: 'Test anlaşması onaylandı',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.patch(`${API_BASE_URL}/notifications/:id/read`, ({ params }) => {
    return HttpResponse.json({
      id: params.id as string,
      type: 'AGREEMENT_APPROVED',
      title: 'Anlaşma Onaylandı',
      message: 'Test anlaşması onaylandı',
      read: true,
      updatedAt: new Date().toISOString(),
    });
  }),

  // Dashboard handlers
  http.get(`${API_BASE_URL}/dashboard/summary`, () => {
    return HttpResponse.json({
      periodCode: '2026-07',
      activeAgreementCount: 5,
      pendingApprovalCount: 2,
      openTaskCount: 3,
      budgetUtilization: {
        onInvoice: {
          allocated: 100000,
          utilized: 40000,
          reserved: 10000,
          available: 50000,
          utilizationPercent: 50,
          status: 'GREEN',
        },
        offInvoice: {
          allocated: 50000,
          utilized: 20000,
          reserved: 5000,
          available: 25000,
          utilizationPercent: 50,
          status: 'GREEN',
        },
        total: {
          allocated: 150000,
          utilized: 60000,
          reserved: 15000,
          available: 75000,
          utilizationPercent: 50,
          status: 'GREEN',
        },
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
      },
    });
  }),

  http.get(`${API_BASE_URL}/dashboard/pending-tasks`, () => {
    return HttpResponse.json({
      pendingApprovals: [],
      pendingManualClaims: [],
      submittedClaims: [],
      awaitingInvoiceClaims: [],
    });
  }),

  http.get(`${API_BASE_URL}/dashboard/cpl-status`, () => {
    return HttpResponse.json({ items: [] });
  }),

  // Master data handlers
  http.get(`${API_BASE_URL}/master-data/channels`, ({ request }) => {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly');
    return HttpResponse.json([
      {
        id: '1',
        code: 'CH001',
        name: 'Test Channel',
        status: 'ACTIVE',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/categories`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'CAT001',
        name: 'Test Category',
        status: 'ACTIVE',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/cpls`, ({ request }) => {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('channelId');
    return HttpResponse.json([
      {
        id: '1',
        code: 'CPL001',
        name: 'Test CPL',
        channelId: channelId || null,
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/forecasting-units`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'FU001',
        name: 'Test FU',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/generic-units`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'GU001',
        name: 'Test GU',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/skus`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'SKU001',
        name: 'Test SKU',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/tactics`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'TAC001',
        name: 'Test Tactic',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/mechanics`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'MEC001',
        name: 'Test Mechanic',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/brands`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'BRAND001',
        name: 'Test Brand',
      },
    ]);
  }),

  http.get(`${API_BASE_URL}/master-data/regions`, () => {
    return HttpResponse.json([
      {
        id: '1',
        code: 'REG001',
        name: 'Test Region',
      },
    ]);
  }),
];

