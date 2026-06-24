import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CategoryToggle } from './CategoryToggle';
import { useCookieContext } from '@/context/CookieContext';
import type {
  CookieCategoryInfo,
  CookiePreferences,
} from '@/types/cookie.types';
import { getDefaultPreferences } from '@/utils/cookieStorage';
import { Separator } from '@/components/ui/separator';

const COOKIE_CATEGORIES: CookieCategoryInfo[] = [
  {
    id: 'necessary',
    title: 'Necessary Cookies',
    description:
      'Essential cookies required for the website to function properly. The site cannot work without these cookies.',
    required: true,
  },
  {
    id: 'functional',
    title: 'Functional Cookies',
    description:
      'Cookies used to remember user preferences and provide enhanced features.',
  },
  {
    id: 'analytics',
    title: 'Analytics Cookies',
    description:
      'Cookies used to understand how the website is used and make improvements.',
  },
  {
    id: 'marketing',
    title: 'Marketing Cookies',
    description:
      'Cookies used to show more relevant ads to users and measure marketing campaigns.',
  },
];

export function CookiePreferencesModal() {
  const {
    showPreferences,
    closePreferences,
    cookieConsent,
    updatePreferences,
    acceptAll,
  } = useCookieContext();

  const [preferences, setPreferences] = useState<CookiePreferences>(
    cookieConsent || getDefaultPreferences()
  );

  // Load current preferences when modal opens
  useEffect(() => {
    if (showPreferences) {
      setPreferences(cookieConsent || getDefaultPreferences());
    }
  }, [showPreferences, cookieConsent]);

  // Scroll lock (Radix Dialog already handles ESC key)
  useEffect(() => {
    if (showPreferences) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPreferences]);

  const handleCategoryChange = (
    categoryId: keyof CookiePreferences,
    checked: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [categoryId]: checked,
    }));
  };

  const handleSave = () => {
    updatePreferences(preferences);
  };

  const handleAcceptAll = () => {
    acceptAll();
  };

  return (
    <Dialog open={showPreferences} onOpenChange={closePreferences}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            You can choose which cookies to accept. Necessary cookies are
            required for the website to function and cannot be disabled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {COOKIE_CATEGORIES.map((category) => (
            <div key={category.id}>
              <CategoryToggle
                category={category}
                checked={preferences[category.id]}
                onCheckedChange={(checked) =>
                  handleCategoryChange(category.id, checked)
                }
                disabled={category.required}
              />
              {category.id !==
                COOKIE_CATEGORIES[COOKIE_CATEGORIES.length - 1].id && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={closePreferences}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleAcceptAll}
            className="w-full sm:w-auto"
          >
            Accept All
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Save and Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
