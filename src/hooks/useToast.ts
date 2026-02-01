import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/ui.slice';

export function useToast() {
  const dispatch = useAppDispatch();

  const show = (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string
  ) => {
    dispatch(addNotification({ type, message }));
    // Note: Auto-removal of notifications should be handled by a Toast component
    // that displays these notifications from the Redux store
  };

  return {
    success: (message: string) => show('success', message),
    error: (message: string) => show('error', message),
    warning: (message: string) => show('warning', message),
    info: (message: string) => show('info', message),
  };
}

