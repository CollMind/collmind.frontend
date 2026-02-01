import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Building2,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  BarChart3,
  Calendar,
  Package,
  UserCog,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSidebarOpen } from '@/store/slices/ui.slice';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMe } from '@/services/users.service';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
  roles?: string[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'User Management',
    icon: UserCog,
    children: [
      {
        title: 'Customers',
        href: '/customers',
        icon: UsersRound,
        badge: 'New',
      },
      {
        title: 'Users',
        href: '/users',
        icon: Users,
        roles: ['ADMIN'],
      },
      {
        title: 'Tenants',
        href: '/tenants',
        icon: Building2,
        roles: ['ADMIN'],
      },
    ],
  },
  {
    title: 'Budget',
    href: '/budget',
    icon: Wallet,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
  },
];

export function Sidebar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const { data: user } = useMe();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)))
      .map((item) => {
        if (item.children) {
          return {
            ...item,
            children: filterNavigation(item.children),
          };
        }
        return item;
      })
      .filter((item) => !item.children || item.children.length > 0);
  };

  const filteredNavigation = useMemo(
    () => filterNavigation(navigation),
    [user?.role]
  );

  const isActive = (href?: string) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some((child) => isActive(child.href) || hasActiveChild(child));
  };

  // Auto-expand items with active children
  useEffect(() => {
    if (!sidebarOpen) return;
    
    const newExpanded = new Set<string>();
    const checkAndExpand = (items: NavItem[]) => {
      items.forEach((item) => {
        if (item.children && hasActiveChild(item)) {
          newExpanded.add(item.title);
        }
        if (item.children) {
          checkAndExpand(item.children);
        }
      });
    };
    
    checkAndExpand(filteredNavigation);
    setExpandedItems(newExpanded);
  }, [location.pathname, sidebarOpen, filteredNavigation]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.title);
    const active = item.href ? isActive(item.href) : false;
    const hasActive = hasActiveChild(item);
    const indentClass = level > 0 ? 'ml-6' : '';

    if (hasChildren) {
      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={() => sidebarOpen && toggleExpand(item.title)}
            className={cn(
              'group flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              hasActive
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-700 dark:text-gray-300',
              indentClass
            )}
          >
            <Icon
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                hasActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
              )}
            />
            <span className={cn('flex-1 text-left', !sidebarOpen && 'sr-only')}>
              {item.title}
            </span>
            {sidebarOpen && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded ? 'rotate-180' : ''
                )}
              />
            )}
          </button>
          {isExpanded && sidebarOpen && (
            <div className="space-y-1 ml-2">
              {item.children?.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (!item.href) return null;

    return (
      <TooltipProvider key={item.href} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={item.href}
              className={cn(
                'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                active
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300',
                indentClass
              )}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                )}
              />
              <span className={cn('flex-1', !sidebarOpen && 'sr-only')}>
                {item.title}
              </span>
              {item.badge && sidebarOpen && (
                <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {item.badge}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          {!sidebarOpen && (
            <TooltipContent side="right" className="ml-2">
              {item.title}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const SidebarContent = () => (
    <ScrollArea className="flex-1 px-3 py-4">
      <nav className="space-y-1">
        {filteredNavigation.map((item) => renderNavItem(item))}
      </nav>

      <Separator className="my-4" />

      {/* Settings Section */}
      <nav className="space-y-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className={cn(
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  isActive('/settings')
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                <Settings
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                    isActive('/settings')
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  )}
                />
                <span className={cn('flex-1', !sidebarOpen && 'sr-only')}>
                  Settings
                </span>
              </Link>
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right" className="ml-2">
                Settings
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </nav>
    </ScrollArea>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:top-16 lg:z-40',
          'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'lg:w-64' : 'lg:w-16'
        )}
      >
        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarOpen ? (
            <>
              <SidebarContent />
              {/* Toggle Button at Bottom */}
              <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch(setSidebarOpen(false))}
                  className="inline-flex w-full h-8 justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="px-2 py-4 flex-1">
                <nav className="space-y-1">
                  {filteredNavigation.map((item) => {
                    const Icon = item.icon;
                    const active = item.href ? isActive(item.href) : hasActiveChild(item);

                    return (
                      <TooltipProvider key={item.title} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {item.href ? (
                              <Link
                                to={item.href}
                                className={cn(
                                  'flex items-center justify-center rounded-lg p-2.5',
                                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                                  active
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                                    : 'text-gray-700 dark:text-gray-300'
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </Link>
                            ) : (
                              <button
                                className={cn(
                                  'flex items-center justify-center rounded-lg p-2.5',
                                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                                  active
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                                    : 'text-gray-700 dark:text-gray-300'
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </button>
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="ml-2">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </nav>
              </div>
              {/* Expand Button at Bottom */}
              <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch(setSidebarOpen(true))}
                  className="inline-flex w-full h-8 justify-center"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(setSidebarOpen(false))}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 lg:hidden"
            >
              <div className="flex flex-col h-full">
                <SidebarContent />
                {/* Toggle Button at Bottom */}
                <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => dispatch(setSidebarOpen(false))}
                    className="inline-flex w-full h-8 justify-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

