import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from './App';
import './index.css';
import { initScrollScrollbarHint } from './lib/scroll-scrollbar-hint';
import { QueryProvider } from './providers/QueryProvider';

initScrollScrollbarHint();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>
);
