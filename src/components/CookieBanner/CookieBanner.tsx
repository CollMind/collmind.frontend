import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCookieContext } from '@/context/CookieContext';
import { CookiePreferencesModal } from '@/components/CookiePreferencesModal';
import { cn } from '@/lib/utils';

export type CookieBannerPosition = 'bottom' | 'bottom-center' | 'top';

interface CookieBannerProps {
  position?: CookieBannerPosition;
  className?: string;
}

export function CookieBanner({
  position = 'bottom',
  className,
}: CookieBannerProps) {
  const { showBanner, acceptAll, rejectAll, openPreferences } =
    useCookieContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showBanner) {
      // Short delay for animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showBanner]);

  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 max-w-4xl mx-4',
    top: 'top-0 left-0 right-0',
  };

  // NOTE: CookiePreferencesModal must always be rendered (outside the
  // `!showBanner` guard below), regardless of the banner's own visibility.
  // openPreferences() sets `showBanner: false` and `showPreferences: true`
  // in the same update (see CookieContext), specifically so the banner
  // hides while the modal opens. If the modal were nested inside an early
  // `if (!showBanner) return null;`, it would never render, and clicking
  // "Manage Preferences" would silently do nothing — a real bug found via
  // T-040's test-suite repair, not just a test issue.
  if (!showBanner) {
    return <CookiePreferencesModal />;
  }

  return (
    <>
      <div
        className={cn(
          'fixed z-50 w-full transition-all duration-300 ease-in-out',
          positionClasses[position],
          isVisible
            ? 'translate-y-0 opacity-100'
            : position === 'bottom' || position === 'bottom-center'
              ? 'translate-y-full opacity-0'
              : '-translate-y-full opacity-0',
          className
        )}
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3
                  id="cookie-banner-title"
                  className="text-sm font-semibold text-gray-900 dark:text-white mb-1"
                >
                  Cookie Usage
                </h3>
                <p
                  id="cookie-banner-description"
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  Our website uses cookies to provide you with the best
                  experience. You can manage your cookie preferences or{' '}
                  <button
                    onClick={openPreferences}
                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    aria-label="Open cookie preferences"
                  >
                    learn more
                  </button>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectAll}
                  className="flex-1 sm:flex-none"
                  aria-label="Reject all optional cookies"
                >
                  Reject All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openPreferences}
                  className="flex-1 sm:flex-none"
                  aria-label="Manage Preferences for cookies"
                >
                  Manage Preferences
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="flex-1 sm:flex-none"
                  aria-label="Accept all cookies"
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesModal />
    </>
  );
}
