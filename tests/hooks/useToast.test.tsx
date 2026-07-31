import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useToast } from '@/hooks/useToast';
import uiReducer from '@/store/slices/ui.slice';

const createMockStore = () => {
  return configureStore({
    reducer: {
      ui: uiReducer,
    },
  });
};

type Store = ReturnType<typeof createMockStore>;

const wrapper = (store: Store) => ({
  children,
}: {
  children: React.ReactNode;
}) => <Provider store={store}>{children}</Provider>;

describe('useToast', () => {
  let store: Store;

  beforeEach(() => {
    store = createMockStore();
  });

  it('should dispatch success notification', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: wrapper(store),
    });

    result.current.success('Success message');

    const state = store.getState();
    expect(state.ui.notifications).toHaveLength(1);
    expect(state.ui.notifications[0].type).toBe('success');
    expect(state.ui.notifications[0].message).toBe('Success message');
  });

  it('should dispatch error notification', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: wrapper(store),
    });

    result.current.error('Error message');

    const state = store.getState();
    expect(state.ui.notifications).toHaveLength(1);
    expect(state.ui.notifications[0].type).toBe('error');
    expect(state.ui.notifications[0].message).toBe('Error message');
  });

  it('should dispatch warning notification', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: wrapper(store),
    });

    result.current.warning('Warning message');

    const state = store.getState();
    expect(state.ui.notifications).toHaveLength(1);
    expect(state.ui.notifications[0].type).toBe('warning');
    expect(state.ui.notifications[0].message).toBe('Warning message');
  });

  it('should dispatch info notification', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: wrapper(store),
    });

    result.current.info('Info message');

    const state = store.getState();
    expect(state.ui.notifications).toHaveLength(1);
    expect(state.ui.notifications[0].type).toBe('info');
    expect(state.ui.notifications[0].message).toBe('Info message');
  });

  it('should dispatch multiple notifications', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: wrapper(store),
    });

    result.current.success('Success 1');
    result.current.error('Error 1');
    result.current.warning('Warning 1');
    result.current.info('Info 1');

    const state = store.getState();
    expect(state.ui.notifications).toHaveLength(4);
  });
});
