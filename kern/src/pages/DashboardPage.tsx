import { useState } from 'react';

import { AddWidgetModal } from '@/components/dashboard/AddWidgetModal';
import { Dashboard } from '@/components/dashboard/Dashboard';

export function DashboardPage() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <Dashboard onOpenAddWidget={() => setAddOpen(true)} />
      <AddWidgetModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
