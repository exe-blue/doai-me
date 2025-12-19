'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Smartphone,
  Youtube,
  LayoutGrid,
  PlayCircle,
  Upload,
  History,
  Activity,
  Settings2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ChevronDown,
  Search,
  TrendingUp,
  Users,
  Lightbulb,
} from 'lucide-react';

// 아이콘 매핑
const iconMap = {
  LayoutDashboard,
  Smartphone,
  Youtube,
  LayoutGrid,
  PlayCircle,
  Upload,
  History,
  Activity,
  Settings2,
  Bell,
  Settings,
  Search,
  TrendingUp,
  Users,
  Lightbulb,
};

// 네비게이션 구조 (4대 카테고리)
const navCategories = [
  {
    id: 'management',
    label: '관리',
    items: [
      { href: '/dashboard/devices', icon: 'Smartphone', label: '기기 관리', description: '600대 상태 모니터링' },
      { href: '/dashboard/channels', icon: 'Youtube', label: '채널 관리', description: 'YouTube 채널 통계' },
      { href: '/dashboard/boards', icon: 'LayoutGrid', label: '보드 현황', description: '30개 보드 연결 상태' },
    ],
  },
  {
    id: 'tasks',
    label: '작업',
    items: [
      { href: '/dashboard/watch', icon: 'PlayCircle', label: '시청 요청', description: '영상 시청 요청', highlight: true, badge: 'MAIN' },
      { href: '/dashboard/uploads', icon: 'Upload', label: '업로드 관리', description: '업로드 스케줄' },
      { href: '/dashboard/logs', icon: 'History', label: '작업 로그', description: '작업 히스토리' },
    ],
  },
  {
    id: 'analysis',
    label: '분석',
    items: [
      { href: '/dashboard/analysis/search', icon: 'Search', label: '검색 분석', description: '키워드 경쟁 분석', badge: 'NEW' },
      { href: '/dashboard/analysis/trends', icon: 'TrendingUp', label: '트렌드 리포트', description: '트렌드 분석' },
      { href: '/dashboard/analysis/competitors', icon: 'Users', label: '경쟁사 분석', description: '경쟁 채널 분석' },
      { href: '/dashboard/analysis/ideas', icon: 'Lightbulb', label: '아이디어 생성', description: 'AI 콘텐츠 아이디어' },
    ],
  },
  {
    id: 'idle',
    label: '유휴',
    items: [
      { href: '/dashboard/idle', icon: 'Activity', label: '활동 현황', description: '6대 활동 모니터링', badge: '6' },
      { href: '/dashboard/idle/settings', icon: 'Settings2', label: '활동 설정', description: '할당/확률 설정' },
    ],
  },
];

const bottomNavItems = [
  { href: '/dashboard/notifications', icon: 'Bell', label: '알림' },
  { href: '/dashboard/settings', icon: 'Settings', label: '설정' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['management', 'tasks', 'analysis', 'idle']);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName as keyof typeof iconMap];
    return Icon || LayoutDashboard;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-foreground">AI</span>
            <span className="text-cyan-400">FARM</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: collapsed ? 72 : 260,
          x: mobileOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -260 : 0)
        }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 bg-zinc-950 border-r border-zinc-800",
          "flex flex-col",
          "lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800">
          <Link href="/dashboard" className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            {!collapsed ? (
              <span className="text-xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
                <span className="text-white">AI</span>
                <span className="text-cyan-400">FARM</span>
                <span className="text-zinc-500 text-sm ml-2">v4</span>
              </span>
            ) : (
              <span className="text-xl font-black text-cyan-400" style={{ fontFamily: 'var(--font-display)' }}>
                A
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8 text-zinc-400 hover:text-white"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* 대시보드 홈 */}
        <div className="px-3 pt-3">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "hover:bg-zinc-800/50",
              pathname === '/dashboard' 
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" 
                : "text-zinc-400 hover:text-white"
            )}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-medium text-sm">대시보드</span>}
          </Link>
        </div>

        {/* Navigation Categories */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-3 space-y-1">
            {navCategories.map((category) => {
              const isExpanded = expandedCategories.includes(category.id);
              const hasActiveItem = category.items.some(item => pathname.startsWith(item.href));
              
              return (
                <div key={category.id} className="py-1">
                  {/* Category Header */}
                  {!collapsed && (
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider",
                        "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors",
                        hasActiveItem && "text-zinc-300"
                      )}
                    >
                      <span>{category.label}</span>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )} />
                    </button>
                  )}
                  
                  {/* Category Items */}
                  <AnimatePresence initial={false}>
                    {(isExpanded || collapsed) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 mt-1">
                          {category.items.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            const Icon = getIcon(item.icon);
                            
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                                  collapsed ? "justify-center" : "",
                                  "hover:bg-zinc-800/50",
                                  isActive && "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
                                  !isActive && "text-zinc-400 hover:text-white",
                                  item.highlight && !isActive && "bg-cyan-500/5 border border-cyan-500/20 text-cyan-400"
                                )}
                                title={collapsed ? item.label : undefined}
                              >
                                <Icon className={cn(
                                  "w-4.5 h-4.5 shrink-0",
                                  isActive && "text-cyan-400",
                                  item.highlight && !isActive && "text-cyan-400"
                                )} />
                                {!collapsed && (
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">{item.label}</span>
                                      {item.badge && (
                                        <Badge 
                                          variant="secondary" 
                                          className={cn(
                                            "text-[10px] h-5 px-1.5 bg-zinc-800",
                                            item.highlight && "bg-cyan-500/20 text-cyan-400"
                                          )}
                                        >
                                          {item.badge}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-zinc-500 truncate block">
                                      {item.description}
                                    </span>
                                  </div>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className="border-t border-zinc-800 p-3 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = getIcon(item.icon);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                  collapsed ? "justify-center" : "",
                  "hover:bg-zinc-800/50",
                  isActive && "bg-zinc-800 text-white",
                  !isActive && "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className="w-4.5 h-4.5" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Status Indicator */}
        {!collapsed && (
          <div className="p-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-zinc-500">시스템 정상</span>
              <span className="text-zinc-600 ml-auto">Vultr 연결됨</span>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 bg-zinc-950",
          "pt-14 lg:pt-0",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
