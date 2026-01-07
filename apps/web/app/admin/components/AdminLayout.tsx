'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// ============================================
// Types
// ============================================

type TabId = 'dashboard' | 'wormholes' | 'nodes' | 'devices' | 'content' | 'monitoring' | 'command' | 'forms';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: TabId;
}

// ============================================
// Admin Layout
// ============================================

export function AdminLayout({ children, activeTab }: AdminLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const tabs: Array<{ id: TabId; label: string; icon: string; href: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/admin' },
    { id: 'monitoring', label: 'Monitoring', icon: '🔦', href: '/admin/monitoring' },
    { id: 'command', label: 'Command', icon: '⚡', href: '/admin/command' },
    { id: 'forms', label: 'Forms', icon: '📝', href: '/admin/forms' },
    { id: 'wormholes', label: 'Wormholes', icon: '🕳️', href: '/admin?tab=wormholes' },
    { id: 'nodes', label: 'Nodes', icon: '🖥️', href: '/admin?tab=nodes' },
    { id: 'devices', label: 'Devices', icon: '📱', href: '/admin/devices' },
    { id: 'content', label: 'Content', icon: '📺', href: '/admin/content' },
  ];

  // Tab 결정 우선순위: activeTab prop > URL query param > pathname 기반
  const validTabs: TabId[] = ['dashboard', 'wormholes', 'nodes', 'devices', 'content', 'monitoring', 'command', 'forms'];
  
  const currentTab: TabId = activeTab || 
    (tabParam && validTabs.includes(tabParam as TabId) ? tabParam as TabId : 
    pathname === '/admin' ? 'dashboard' : 
    pathname.includes('/monitoring') ? 'monitoring' :
    pathname.includes('/command') ? 'command' :
    pathname.includes('/forms') ? 'forms' :
    pathname.includes('/devices') ? 'devices' :
    pathname.includes('/content') ? 'content' : 'dashboard');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 sticky top-0 bg-neutral-950/95 backdrop-blur z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="text-2xl"
              >
                🕳️
              </motion.span>
              <h1 className="text-lg font-mono text-neutral-200">DoAi.Me Admin</h1>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <NavTab
                key={tab.id}
                href={tab.href}
                icon={tab.icon}
                label={tab.label}
                active={currentTab === tab.id}
              />
            ))}
          </nav>
          
          {/* User Menu */}
          <div className="text-neutral-500 text-sm">
            <LogoutButton />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

// ============================================
// Nav Tab
// ============================================

function NavTab({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
        active 
          ? 'bg-neutral-800 text-neutral-100' 
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
      }`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

// ============================================
// Logout Button
// ============================================

function LogoutButton() {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout failed:', error);
        alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
        return;
      }
      window.location.href = '/auth/login';
    } catch (err) {
      console.error('Logout error:', err);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };
  
  return (
    <button
      onClick={handleLogout}
      className="hover:text-neutral-300 transition-colors"
    >
      Logout
    </button>
  );
}

