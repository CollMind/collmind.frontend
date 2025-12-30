import React from 'react';
import { Button } from '@/components/ui/button';
import { useCookieContext } from '@/context/CookieContext';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CookieSettingsButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function CookieSettingsButton({
  variant = 'ghost',
  size = 'default',
  className,
  children,
}: CookieSettingsButtonProps) {
  const { openPreferences } = useCookieContext();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={openPreferences}
      className={cn(className)}
      aria-label="Open cookie settings"
    >
      {children || (
        <>
          <Settings className="h-4 w-4 mr-2" />
          Cookie Settings
        </>
      )}
    </Button>
  );
}

