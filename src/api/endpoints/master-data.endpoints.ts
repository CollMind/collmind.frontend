import apiClient from '../client';

// Channel endpoints
export const channelEndpoints = {
  getAll: (activeOnly?: boolean) =>
    apiClient.get('/master-data/channels', { params: { activeOnly } }),

  getById: (id: string) => apiClient.get(`/master-data/channels/${id}`),

  create: (data: any) => apiClient.post('/master-data/channels', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/channels/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/channels/${id}`),
};

// Category endpoints
export const categoryEndpoints = {
  getAll: (activeOnly?: boolean) =>
    apiClient.get('/master-data/categories', { params: { activeOnly } }),

  getById: (id: string) => apiClient.get(`/master-data/categories/${id}`),

  create: (data: any) => apiClient.post('/master-data/categories', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/categories/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/categories/${id}`),
};

// CPL endpoints
export const cplEndpoints = {
  getAll: (activeOnly?: boolean, channelId?: string) =>
    apiClient.get('/master-data/cpls', { params: { activeOnly, channelId } }),

  getById: (id: string) => apiClient.get(`/master-data/cpls/${id}`),

  create: (data: any) => apiClient.post('/master-data/cpls', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/cpls/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/cpls/${id}`),
};

// Forecasting Unit endpoints
export const fuEndpoints = {
  getAll: (activeOnly?: boolean, guId?: string, categoryId?: string) =>
    apiClient.get('/master-data/forecasting-units', { params: { activeOnly, guId, categoryId } }),

  getById: (id: string) => apiClient.get(`/master-data/forecasting-units/${id}`),

  create: (data: any) => apiClient.post('/master-data/forecasting-units', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/forecasting-units/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/forecasting-units/${id}`),
};

// Generic Unit endpoints
export const guEndpoints = {
  getAll: (activeOnly?: boolean) =>
    apiClient.get('/master-data/generic-units', { params: { activeOnly } }),

  getById: (id: string) => apiClient.get(`/master-data/generic-units/${id}`),

  create: (data: any) => apiClient.post('/master-data/generic-units', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/generic-units/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/generic-units/${id}`),
};

// SKU endpoints
export const skuEndpoints = {
  getAll: (activeOnly?: boolean, fuId?: string, brandId?: string, categoryId?: string) =>
    apiClient.get('/master-data/skus', { params: { activeOnly, fuId, brandId, categoryId } }),

  getById: (id: string) => apiClient.get(`/master-data/skus/${id}`),

  create: (data: any) => apiClient.post('/master-data/skus', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/skus/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/skus/${id}`),
  
  assignToFu: (skuId: string, fuId: string) =>
    apiClient.patch(`/master-data/skus/${skuId}`, { fuId: fuId || null }),
};

// Tactic endpoints
export const tacticEndpoints = {
  getAll: (activeOnly?: boolean) =>
    apiClient.get('/master-data/tactics', { params: { activeOnly } }),

  getById: (id: string) => apiClient.get(`/master-data/tactics/${id}`),

  create: (data: any) => apiClient.post('/master-data/tactics', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/tactics/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/tactics/${id}`),
};

// Mechanic endpoints
export const mechanicEndpoints = {
  getAll: (activeOnly?: boolean, tacticId?: string) =>
    apiClient.get('/master-data/mechanics', { 
      params: { 
        activeOnly: activeOnly ? 'true' : undefined, 
        tacticId 
      } 
    }),

  getById: (id: string) => apiClient.get(`/master-data/mechanics/${id}`),

  create: (data: any) => apiClient.post('/master-data/mechanics', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/mechanics/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/mechanics/${id}`),

  getApplicable: (context: { channelCode?: string; channelId?: string; categoryCode?: string; categoryId?: string; cplId?: string; cplCodes?: string[] }) =>
    apiClient.post('/master-data/mechanics/applicable', context),
};

// Brand endpoints
export const brandEndpoints = {
  getAll: (activeOnly?: boolean) =>
    apiClient.get('/master-data/brands', { params: { activeOnly } }),

  getById: (id: string) => apiClient.get(`/master-data/brands/${id}`),

  create: (data: any) => apiClient.post('/master-data/brands', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/brands/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/brands/${id}`),
};

// Region endpoints
export const regionEndpoints = {
  getAll: (activeOnly?: boolean) =>
    apiClient.get('/master-data/regions', { params: { activeOnly } }),

  getById: (id: string) => apiClient.get(`/master-data/regions/${id}`),

  create: (data: any) => apiClient.post('/master-data/regions', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/master-data/regions/${id}`, data),

  delete: (id: string) => apiClient.delete(`/master-data/regions/${id}`),
};
