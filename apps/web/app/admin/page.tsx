// app/admin/page.tsx
// Admin Dashboard - 21st.dev 스타일 리디자인

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  Zap, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Cpu,
  Lock
} from 'lucide-react';

// Widgets
import { 
  WormholeVolumeWidget,
  WormholeTopContextWidget,
  WormholeTypeDistributionWidget,
  WormholeScoreHistogramWidget,
} from './components/WormholeWidgets';
import { NodesStatusSummaryWidget, NodesList } from './components/NodesStatusPanel';
import { WormholeEventsList } from './components/WormholeEventsList';

// ============================================
// Admin Dashboard
// ============================================

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'wormholes' | 'nodes'>('wormholes');
  const [timeFilter, setTimeFilter] = useState<'1h' | '24h' | '7d' | 'all'>('24h');
  const [contextFilter, setContextFilter] = useState<string | undefined>();
  
  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthorized(false);
        return;
      }
      
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setIsAuthorized(
        adminUser?.role === 'admin' || 
        adminUser?.role === 'super_admin' || 
        adminUser?.role === 'viewer'
      );
    };
    
    checkAuth();
  }, []);
  
  // Loading State
  if (isAuthorized === null) {
    return <LoadingState />;
  }
  
  // Unauthorized State
  if (!isAuthorized) {
    return <UnauthorizedState />;
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="h-6 w-6 text-primary" />
            </motion.div>
            <h1 className="text-lg font-semibold">
              DoAi.Me <span className="text-muted-foreground font-normal">Admin</span>
            </h1>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
            <TabButton 
              active={activeTab === 'wormholes'} 
              onClick={() => setActiveTab('wormholes')}
              icon={<Zap className="h-4 w-4" />}
            >
              Wormholes
            </TabButton>
            <TabButton 
              active={activeTab === 'nodes'} 
              onClick={() => setActiveTab('nodes')}
              icon={<Server className="h-4 w-4" />}
            >
              Nodes
            </TabButton>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-signal-green animate-pulse" />
              Live
            </Badge>
            <LogoutButton />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'wormholes' ? (
          <WormholesTab 
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            contextFilter={contextFilter}
            setContextFilter={setContextFilter}
          />
        ) : (
          <NodesTab />
        )}
      </main>
    </div>
  );
}

// ============================================
// Loading State
// ============================================

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Zap className="h-12 w-12 text-primary" />
        </motion.div>
        <span className="text-sm text-muted-foreground">Loading dashboard...</span>
      </div>
    </div>
  );
}

// ============================================
// Unauthorized State
// ============================================

function UnauthorizedState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/10">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            관리자 승인이 필요합니다. 승인 후 다시 시도해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/admin/login">로그인</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Wormholes Tab
// ============================================

interface WormholesTabProps {
  timeFilter: '1h' | '24h' | '7d' | 'all';
  setTimeFilter: (f: '1h' | '24h' | '7d' | 'all') => void;
  contextFilter?: string;
  setContextFilter: (c: string | undefined) => void;
}

function WormholesTab({ timeFilter, setTimeFilter, contextFilter, setContextFilter }: WormholesTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WormholeVolumeWidget />
        <WormholeTypeDistributionWidget />
        <WormholeScoreHistogramWidget />
      </div>
      
      {/* Context + Events Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Contexts */}
        <div>
          <WormholeTopContextWidget 
            onContextClick={(ctx) => setContextFilter(ctx === contextFilter ? undefined : ctx)}
          />
        </div>
        
        {/* Events List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-medium">Wormhole Events</CardTitle>
                  {contextFilter && (
                    <Badge variant="secondary" className="gap-1">
                      {contextFilter}
                      <button 
                        onClick={() => setContextFilter(undefined)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
                
                {/* Time Filter */}
                <div className="flex gap-1">
                  {(['1h', '24h', '7d', 'all'] as const).map((t) => (
                    <Button
                      key={t}
                      variant={timeFilter === t ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setTimeFilter(t)}
                      className="h-7 text-xs"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              <WormholeEventsList 
                timeFilter={timeFilter}
                contextFilter={contextFilter}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Nodes Tab
// ============================================

function NodesTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  
  const statusOptions = [
    { value: undefined, label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'in_umbra', label: '숨그늘' },
    { value: 'offline', label: 'Offline' },
    { value: 'error', label: 'Error' },
  ];
  
  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <NodesStatusSummaryWidget />
      
      {/* Nodes List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Node List</CardTitle>
            
            {/* Status Filter */}
            <div className="flex gap-1">
              {statusOptions.map((opt) => (
                <Button
                  key={opt.label}
                  variant={statusFilter === opt.value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(opt.value)}
                  className="h-7 text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-y-auto">
          <NodesList statusFilter={statusFilter} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// UI Components
// ============================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      {icon}
      {children}
    </Button>
  );
}

function LogoutButton() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
    >
      Logout
    </Button>
  );
}
