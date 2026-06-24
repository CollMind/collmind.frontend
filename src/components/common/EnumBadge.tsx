import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  UserRole,
  UserStatus,
  CustomerChannel,
  CustomerStatus,
  CustomerType,
  TenantStatus,
  TenantPlan,
} from '@/types';

type EnumValue =
  | UserRole
  | UserStatus
  | CustomerChannel
  | CustomerStatus
  | CustomerType
  | TenantStatus
  | TenantPlan
  | string;

interface EnumBadgeProps {
  value: EnumValue;
  type?: 'status' | 'role' | 'channel' | 'type' | 'plan' | 'auto';
  className?: string;
}

const getStatusColor = (status: string): string => {
  const statusUpper = status.toUpperCase();
  switch (statusUpper) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'INACTIVE':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    case 'SUSPENDED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'LOCKED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'TRIAL':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const getRoleColor = (role: string): string => {
  const roleUpper = role.toUpperCase();
  switch (roleUpper) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    case 'PLANNER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'MANAGER':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'APPROVER':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'FINANCE':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'FINANCE_MANAGER':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    case 'CATEGORY_MANAGER':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800';
    case 'READONLY':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const getChannelColor = (channel: string): string => {
  const channelUpper = channel.toUpperCase();
  switch (channelUpper) {
    case 'NKA':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    case 'TRADITIONAL_TRADE':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    case 'E_COMMERCE':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800';
    case 'EXPORT':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800';
    case 'WHOLESALE':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800';
    case 'RETAIL':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800';
    case 'HORECA':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const getTypeColor = (type: string): string => {
  const typeUpper = type.toUpperCase();
  switch (typeUpper) {
    case 'DIRECT':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'DISTRIBUTOR':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800';
    case 'WHOLESALER':
      return 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400 border-lime-200 dark:border-lime-800';
    case 'RETAILER':
      return 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800';
    case 'END_CUSTOMER':
      return 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400 border-stone-200 dark:border-stone-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const getPlanColor = (plan: string): string => {
  const planUpper = plan.toUpperCase();
  switch (planUpper) {
    case 'FREE':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    case 'BASIC':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'PROFESSIONAL':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    case 'ENTERPRISE':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const formatLabel = (value: string): string => {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function EnumBadge({ value, type = 'auto', className }: EnumBadgeProps) {
  if (!value) return null;

  const valueStr = String(value);
  let colorClass = '';

  if (type === 'auto') {
    // Auto-detect type based on known enum values
    const valueUpper = valueStr.toUpperCase();

    // Check if it's a status
    if (
      [
        'ACTIVE',
        'INACTIVE',
        'PENDING',
        'SUSPENDED',
        'LOCKED',
        'TRIAL',
      ].includes(valueUpper)
    ) {
      colorClass = getStatusColor(valueStr);
    }
    // Check if it's a role
    else if (
      [
        'ADMIN',
        'PLANNER',
        'MANAGER',
        'APPROVER',
        'FINANCE',
        'FINANCE_MANAGER',
        'CATEGORY_MANAGER',
        'READONLY',
      ].includes(valueUpper)
    ) {
      colorClass = getRoleColor(valueStr);
    }
    // Check if it's a channel
    else if (
      [
        'NKA',
        'TRADITIONAL_TRADE',
        'E_COMMERCE',
        'EXPORT',
        'WHOLESALE',
        'RETAIL',
        'HORECA',
      ].includes(valueUpper)
    ) {
      colorClass = getChannelColor(valueStr);
    }
    // Check if it's a type
    else if (
      [
        'DIRECT',
        'DISTRIBUTOR',
        'WHOLESALER',
        'RETAILER',
        'END_CUSTOMER',
      ].includes(valueUpper)
    ) {
      colorClass = getTypeColor(valueStr);
    }
    // Check if it's a plan
    else if (
      ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'].includes(valueUpper)
    ) {
      colorClass = getPlanColor(valueStr);
    }
    // Default
    else {
      colorClass = getStatusColor(valueStr);
    }
  } else {
    switch (type) {
      case 'status':
        colorClass = getStatusColor(valueStr);
        break;
      case 'role':
        colorClass = getRoleColor(valueStr);
        break;
      case 'channel':
        colorClass = getChannelColor(valueStr);
        break;
      case 'type':
        colorClass = getTypeColor(valueStr);
        break;
      case 'plan':
        colorClass = getPlanColor(valueStr);
        break;
      default:
        colorClass = getStatusColor(valueStr);
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'border px-2.5 py-0.5 text-xs font-semibold rounded-full',
        colorClass,
        className
      )}
    >
      {formatLabel(valueStr)}
    </Badge>
  );
}
