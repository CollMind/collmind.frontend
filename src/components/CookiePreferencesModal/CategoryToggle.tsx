import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CookieCategory, CookieCategoryInfo } from '@/types/cookie.types';
import { cn } from '@/lib/utils';

interface CategoryToggleProps {
  category: CookieCategoryInfo;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function CategoryToggle({
  category,
  checked,
  onCheckedChange,
  disabled = false,
}: CategoryToggleProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-3">
        <Checkbox
          id={category.id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || category.required}
          className="mt-1"
          aria-label={`${checked ? 'Disable' : 'Enable'} ${category.title.toLowerCase()}`}
        />
        <div className="flex-1 space-y-1">
          <Label
            htmlFor={category.id}
            className={cn(
              'text-sm font-medium leading-none cursor-pointer',
              (disabled || category.required) && 'cursor-not-allowed opacity-60'
            )}
          >
            {category.title}
            {category.required && (
              <span className="ml-2 text-xs text-gray-500">(Required)</span>
            )}
          </Label>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {category.description}
          </p>
        </div>
      </div>
    </div>
  );
}
