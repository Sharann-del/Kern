import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-kern-bg p-8">
      <p className="font-mono text-8xl text-kern-text-3">404</p>
      <p className="text-lg font-medium text-kern-text">Page not found</p>
      <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
        ← Go home
      </Button>
    </div>
  );
}
