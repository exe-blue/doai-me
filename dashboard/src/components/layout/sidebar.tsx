'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/Logo';
import {
  LayoutDashboard,
  Activity,
  Tv,
  Trophy,
  Zap,
  Lightbulb,
  Smartphone,
  Bell,
  Send,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { href: '/dashboard/activities', icon: Activity, label: '활동' },
  { href: '/dashboard/channels', icon: Tv, label: '채널' },
  { href: '/dashboard/ranking', icon: Trophy, label: '랭킹' },
  { href: '/dashboard/battle', icon: Zap, label: '배틀로그' },
  { href: '/dashboard/ideas', icon: Lightbulb, label: '아이디어' },
  { href: '/dashboard/devices', icon: Smartphone, label: '디바이스' },
  { href: '/dashboard/notifications', icon: Bell, label: '알림' },
  { href: '/dashboard/do', icon: Send, label: 'DO 요청' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen flex flex-col bg-card/50 border-r border-border/50">
      {/* Logo */}
      <div className="p-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-border/50 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
          설정
        </Link>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          onClick={() => {/* TODO: logout */}}
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}

