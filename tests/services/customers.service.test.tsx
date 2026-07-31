import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { store } from '@/store';
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useActivateCustomer,
  useDeactivateCustomer,
  useSearchCustomers,
  useCustomerStats,
  useCustomerImport,
} from '@/services/customers.service';
import {
  CustomerChannel,
  CustomerStatus,
  CustomerType,
} from '@/types/customer.types';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  </Provider>
);

describe('Customers Service', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  describe('useCustomers', () => {
    it('should fetch customers list', async () => {
      const { result } = renderHook(() => useCustomers(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
      if (result.current.data && result.current.data.length > 0) {
        expect(result.current.data[0]).toHaveProperty('id');
        expect(result.current.data[0]).toHaveProperty('code');
        expect(result.current.data[0]).toHaveProperty('name');
      }
    });

    it('should filter customers by channel', async () => {
      const { result } = renderHook(
        () => useCustomers({ channel: CustomerChannel.RETAIL }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should filter customers by status', async () => {
      const { result } = renderHook(
        () => useCustomers({ status: CustomerStatus.ACTIVE }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should search customers', async () => {
      const { result } = renderHook(
        () => useCustomers({ search: 'Test' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useCustomer', () => {
    it('should fetch customer by id', async () => {
      const { result } = renderHook(() => useCustomer('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe('1');
      expect(result.current.data?.code).toBe('CUST001');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useCustomer(''), { wrapper });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useSearchCustomers', () => {
    it('should search customers by query', async () => {
      const { result } = renderHook(() => useSearchCustomers('test'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('should not search when query is empty', () => {
      const { result } = renderHook(() => useSearchCustomers(''), { wrapper });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useCustomerStats', () => {
    it('should fetch customer stats', async () => {
      const { result } = renderHook(() => useCustomerStats('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data).toHaveProperty('totalOrders');
      expect(result.current.data).toHaveProperty('totalRevenue');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useCustomerStats(''), { wrapper });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useCreateCustomer', () => {
    it('should create a new customer', async () => {
      const { result } = renderHook(() => useCreateCustomer(), { wrapper });

      await result.current.mutateAsync({
        code: 'CUST003',
        name: 'New Customer',
        channel: CustomerChannel.RETAIL,
        type: CustomerType.DIRECT,
        status: CustomerStatus.ACTIVE,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.code).toBe('CUST003');
      expect(result.current.data?.name).toBe('New Customer');
    });
  });

  describe('useUpdateCustomer', () => {
    it('should update customer', async () => {
      const { result } = renderHook(() => useUpdateCustomer(), { wrapper });

      await result.current.mutateAsync({
        id: '1',
        data: {
          name: 'Updated Customer',
          city: 'Ankara',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.name).toBe('Updated Customer');
    });
  });

  describe('useDeleteCustomer', () => {
    it('should delete customer', async () => {
      const { result } = renderHook(() => useDeleteCustomer(), { wrapper });

      await result.current.mutateAsync('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('useActivateCustomer', () => {
    it('should activate customer', async () => {
      const { result } = renderHook(() => useActivateCustomer(), { wrapper });

      await result.current.mutateAsync('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe(CustomerStatus.ACTIVE);
    });
  });

  describe('useDeactivateCustomer', () => {
    it('should deactivate customer', async () => {
      const { result } = renderHook(() => useDeactivateCustomer(), {
        wrapper,
      });

      await result.current.mutateAsync('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe(CustomerStatus.INACTIVE);
    });
  });

  describe('useCustomerImport', () => {
    it('should import customers from file', async () => {
      const { result } = renderHook(() => useCustomerImport(), { wrapper });

      const file = new File(['test content'], 'test.csv', {
        type: 'text/csv',
      });

      await result.current.mutateAsync(file);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.importResult).toBeDefined();
      expect(result.current.importResult?.total).toBe(10);
      expect(result.current.importResult?.created).toBe(8);
      expect(result.current.importResult?.skipped).toBe(2);
      expect(result.current.importResult?.errors).toHaveLength(2);
    });

    it('should handle import errors', async () => {
      server.use(
        http.post('http://localhost:3000/customers/import', () => {
          return HttpResponse.json(
            { message: 'Dosya formatı geçersiz' },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useCustomerImport(), { wrapper });

      const file = new File(['invalid content'], 'test.txt', {
        type: 'text/plain',
      });

      await expect(result.current.mutateAsync(file)).rejects.toThrow();
    });
  });
});
