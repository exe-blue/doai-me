// app/admin/monitoring/page.tsx
// Device Grid + Runner Status Bar (Orion P0)

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { checkAdminAuth } from '../actions';
import { AdminLayout } from '../components/AdminLayout';
import { MonitoringDashboard } from './MonitoringDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MonitoringPage() {
  // Auth check (SSR)
  const auth = await checkAdminAuth();
  if (!auth.authorized) {
    redirect('/admin/unauthorized');
  }

  return (
    <AdminLayout activeTab="monitoring">
      <Suspense fallback={<MonitoringSkeleton />}>
        <MonitoringDashboard />
      </Suspense>
    </AdminLayout>
  );
}

function MonitoringSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 bg-neutral-900 border border-neutral-800 rounded-lg animate-pulse" />
      <div className="h-[600px] bg-neutral-900 border border-neutral-800 rounded-lg animate-pulse" />
    </div>
  );
}


