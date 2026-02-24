import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { queryClient } from '@/lib/react-query';
import { router } from '@/routes';
import { CookieProvider } from '@/context/CookieContext';
import { CookieBanner } from '@/components/CookieBanner';
import { ToastContainer } from '@/components/common/ToastContainer';
import './index.css';

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <CookieProvider>
          <RouterProvider router={router} />
          <CookieBanner position="bottom" />
          <ToastContainer />
        </CookieProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;

