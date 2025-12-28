'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Activity,
  Users,
  Smartphone,
  Trophy,
  Swords,
  Lightbulb,
  Target,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Send,
  List,
} from 'lucide-react';

const navItems = [
  { 
    href: '/dashboard', 
    icon: LayoutDashboard, 
    label: '대시보드',
    description: '전체 현황'
  },
  { 
    href: '/dashboard/do', 
    icon: Send, 
    label: 'DO 요청 지시',
    description: '작업 요청 관리',
    badge: 'NEW',
    highlight: true
  },
  { 
    href: '/dashboard/activities', 
    icon: Activity, 
    label: 'BE 에이전트 활동',
    description: '6대 상시 활동',
    badge: '6'
  },
  { 
    href: '/dashboard/logs', 
    icon: List, 
    label: '통합 내역',
    description: 'DO + BE 기록'
  },
  { 
    href: '/dashboard/channels', 
    icon: Users, 
    label: '채널 관리',
    description: '게임화 시스템',
    badge: '10'
  },
  { 
    href: '/dashboard/devices', 
    icon: Smartphone, 
    label: '디바이스',
    description: '600대 모니터링'
  },
  { 
    href: '/dashboard/ranking', 
    icon: Trophy, 
    label: '랭킹 보드',
    description: '경쟁 현황'
  },
  { 
    href: '/dashboard/battle', 
    icon: Swords, 
    label: '배틀 로그',
    description: '실시간 이벤트'
  },
  { 
    href: '/dashboard/ideas', 
    icon: Lightbulb, 
    label: '리믹스 아이디어',
    description: 'AI 생성 아이디어'
  },
  { 
    href: '/dashboard/trends', 
    icon: Target, 
    label: '트렌드/챌린지',
    description: '발견된 트렌드'
  },
];

const bottomNavItems = [
  { href: '/dashboard/notifications', icon: Bell, label: '알림' },
  { href: '/dashboard/settings', icon: Settings, label: '설정' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo_darkmode.svg"
            alt="WithB.io"
            width={120}
            height={32}
            priority
          />
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
          width: collapsed ? 80 : 280,
          x: mobileOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -280 : 0)
        }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 bg-sidebar border-r border-sidebar-border",
          "flex flex-col",
          "lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/" className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            {!collapsed ? (
              <Image
                src="/logo_darkmode.svg"
                alt="WithB.io"
                width={140}
                height={36}
                priority
              />
            ) : (
              <span className="text-xl font-black text-cyan-400" style={{ fontFamily: 'var(--font-display)' }}>
                W
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent",
                    isActive && "bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/30",
                    !isActive && "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-sidebar-primary")} />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {item.description}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                  "hover:bg-sidebar-accent",
                  isActive && "bg-sidebar-accent text-sidebar-primary",
                  !isActive && "text-sidebar-foreground/70"
                )}
              >
                <item.icon className="w-5 h-5" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Status Indicator */}
        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-2 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-muted-foreground">System Online</span>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          "pt-14 lg:pt-0",
          collapsed ? "lg:pl-20" : "lg:pl-[280px]"
        )}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
