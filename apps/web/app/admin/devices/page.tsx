// app/admin/devices/page.tsx
// Devices Management Page

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { checkAdminAuth, getDevicesList } from '../actions';
import { DevicesTable } from './DevicesTable';
import { AdminLayout } from '../components/AdminLayout';

export const dynamic = 'force-dynamic';

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string; status?: string }>;
}) {
  // Auth check (SSR)
  const auth = await checkAdminAuth();
  if (!auth.authorized) {
    redirect('/admin/unauthorized');
  }

  const resolvedParams = await searchParams;

  // Get devices
  const devices = await getDevicesList(
    resolvedParams.node,
    resolvedParams.status
  );

  return (
    <AdminLayout activeTab="devices">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-neutral-200 font-mono">DEVICES</h1>
            <p className="text-neutral-500 text-sm mt-1">
              노드별 디바이스 상태 관리
            </p>
          </div>
          
          {/* Filters */}
          <Suspense fallback={<div className="h-10 w-48 bg-neutral-800 rounded animate-pulse" />}>
            <DeviceFilters
              currentNode={resolvedParams.node}
              currentStatus={resolvedParams.status}
            />
          </Suspense>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={devices.length}
            color="neutral"
          />
          <StatCard
            label="Online"
            value={devices.filter(d => d.status === 'online').length}
            color="emerald"
          />
          <StatCard
            label="Busy"
            value={devices.filter(d => d.status === 'busy').length}
            color="blue"
          />
          <StatCard
            label="Error"
            value={devices.filter(d => d.status === 'error' || d.status === 'missing').length}
            color="red"
          />
        </div>

        {/* Devices Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <Suspense fallback={<TableSkeleton />}>
            <DevicesTable devices={devices} />
          </Suspense>
        </div>
      </div>
    </AdminLayout>
  );
}

// ============================================
// Device Filters
// ============================================

async function DeviceFilters({
  currentNode,
  currentStatus,
}: {
  currentNode?: string;
  currentStatus?: string;
}) {
  const statuses = ['all', 'online', 'busy', 'offline', 'error', 'missing'];

  return (
    <div className="flex items-center gap-2">
      {/* Status Filter */}
      <div className="flex gap-1 bg-neutral-900 rounded-lg p-1">
        {statuses.map((status) => (
          <a
            key={status}
            href={`/admin/devices?${new URLSearchParams({
              ...(currentNode ? { node: currentNode } : {}),
              ...(status !== 'all' ? { status } : {}),
            }).toString()}`}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              (status === 'all' && !currentStatus) || currentStatus === status
                ? 'bg-neutral-700 text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </a>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Stat Card
// ============================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'neutral' | 'emerald' | 'blue' | 'red';
}) {
  const colors = {
    neutral: 'border-neutral-800 text-neutral-300',
    emerald: 'border-emerald-900/50 text-emerald-400',
    blue: 'border-blue-900/50 text-blue-400',
    red: 'border-red-900/50 text-red-400',
  };

  return (
    <div className={`bg-neutral-900 border rounded-lg p-4 ${colors[color]}`}>
      <div className="text-neutral-500 text-xs mb-1">{label}</div>
      <div className="text-2xl font-mono">{value}</div>
    </div>
  );
}

// ============================================
// Table Skeleton
// ============================================

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-12 bg-neutral-800 rounded animate-pulse" />
      ))}
    </div>
  );
}


