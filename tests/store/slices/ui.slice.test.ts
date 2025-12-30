import { describe, it, expect, beforeEach } from 'vitest';
import uiReducer, {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  addNotification,
  removeNotification,
} from '@/store/slices/ui.slice';

describe('uiSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return initial state', () => {
    const state = uiReducer(undefined, { type: 'unknown' });
    expect(state.sidebarOpen).toBe(true);
    expect(state.theme).toBe('light');
    expect(state.notifications).toEqual([]);
  });

  it('should handle toggleSidebar', () => {
    const initialState = {
      sidebarOpen: true,
      theme: 'light' as const,
      notifications: [],
    };

    const state = uiReducer(initialState, toggleSidebar());
    expect(state.sidebarOpen).toBe(false);

    const newState = uiReducer(state, toggleSidebar());
    expect(newState.sidebarOpen).toBe(true);
  });

  it('should handle setSidebarOpen', () => {
    const state = uiReducer(undefined, setSidebarOpen(false));
    expect(state.sidebarOpen).toBe(false);

    const newState = uiReducer(state, setSidebarOpen(true));
    expect(newState.sidebarOpen).toBe(true);
  });

  it('should handle setTheme', () => {
    const state = uiReducer(undefined, setTheme('dark'));
    expect(state.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    const newState = uiReducer(state, setTheme('auto'));
    expect(newState.theme).toBe('auto');
    expect(localStorage.getItem('theme')).toBe('auto');
  });

  it('should handle addNotification', () => {
    const state = uiReducer(
      undefined,
      addNotification({ type: 'success', message: 'Test message' })
    );

    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('success');
    expect(state.notifications[0].message).toBe('Test message');
    expect(state.notifications[0].id).toBeDefined();
    expect(state.notifications[0].timestamp).toBeDefined();
  });

  it('should handle removeNotification', () => {
    const stateWithNotification = uiReducer(
      undefined,
      addNotification({ type: 'error', message: 'Error message' })
    );

    const notificationId = stateWithNotification.notifications[0].id;
    const state = uiReducer(stateWithNotification, removeNotification(notificationId));

    expect(state.notifications).toHaveLength(0);
  });

  it('should only remove the specified notification', () => {
    const stateWithNotifications = uiReducer(
      undefined,
      addNotification({ type: 'info', message: 'First' })
    );

    const firstId = stateWithNotifications.notifications[0].id;

    const stateWithTwo = uiReducer(
      stateWithNotifications,
      addNotification({ type: 'warning', message: 'Second' })
    );

    const state = uiReducer(stateWithTwo, removeNotification(firstId));

    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].message).toBe('Second');
  });
});

