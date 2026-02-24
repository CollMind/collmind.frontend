import { useQuery } from '@tanstack/react-query';
import {
  channelEndpoints,
  categoryEndpoints,
  cplEndpoints,
  fuEndpoints,
  guEndpoints,
  skuEndpoints,
  tacticEndpoints,
  mechanicEndpoints,
  brandEndpoints,
  regionEndpoints,
} from '@/api/endpoints/master-data.endpoints';

// Channel hooks
export const useChannels = (activeOnly = false) => {
  return useQuery({
    queryKey: ['channels', activeOnly],
    queryFn: () => channelEndpoints.getAll(activeOnly).then((res) => res.data),
  });
};

// Category hooks
export const useCategories = (activeOnly = false) => {
  return useQuery({
    queryKey: ['categories', activeOnly],
    queryFn: () => categoryEndpoints.getAll(activeOnly).then((res) => res.data),
    staleTime: 0, // Always fetch fresh data to ensure categories are up-to-date
    refetchOnMount: true, // Refetch when component mounts
  });
};

// CPL hooks
export const useCpls = (activeOnly = false, channelId?: string) => {
  return useQuery({
    queryKey: ['cpls', activeOnly, channelId],
    queryFn: () => cplEndpoints.getAll(activeOnly, channelId).then((res) => res.data),
    // Always enabled - channelId is optional filter parameter, not a requirement
    enabled: true,
  });
};

// Forecasting Unit hooks
export const useForecastingUnits = (activeOnly = false, guId?: string, categoryId?: string) => {
  return useQuery({
    queryKey: ['forecasting-units', activeOnly, guId, categoryId],
    queryFn: () => fuEndpoints.getAll(activeOnly, guId, categoryId).then((res) => res.data),
  });
};

// Generic Unit hooks
export const useGenericUnits = (activeOnly = false) => {
  return useQuery({
    queryKey: ['generic-units', activeOnly],
    queryFn: () => guEndpoints.getAll(activeOnly).then((res) => res.data),
  });
};

// SKU hooks
export const useSkus = (activeOnly = false, fuId?: string, brandId?: string, categoryId?: string) => {
  return useQuery({
    queryKey: ['skus', activeOnly, fuId, brandId, categoryId],
    queryFn: () => skuEndpoints.getAll(activeOnly, fuId, brandId, categoryId).then((res) => res.data),
  });
};

// Tactic hooks
export const useTactics = (activeOnly = false) => {
  return useQuery({
    queryKey: ['tactics', activeOnly],
    queryFn: () => tacticEndpoints.getAll(activeOnly).then((res) => res.data),
  });
};

// Mechanic hooks
export const useMechanics = (activeOnly = false, tacticId?: string) => {
  return useQuery({
    queryKey: ['mechanics', activeOnly, tacticId],
    queryFn: () => mechanicEndpoints.getAll(activeOnly, tacticId).then((res) => res.data),
  });
};

// Brand hooks
export const useBrands = (activeOnly = false) => {
  return useQuery({
    queryKey: ['brands', activeOnly],
    queryFn: () => brandEndpoints.getAll(activeOnly).then((res) => res.data),
  });
};

// Region hooks
export const useRegions = (activeOnly = false) => {
  return useQuery({
    queryKey: ['regions', activeOnly],
    queryFn: () => regionEndpoints.getAll(activeOnly).then((res) => res.data),
  });
};
