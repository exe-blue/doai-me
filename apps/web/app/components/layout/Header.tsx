'use client';

// ============================================
// Header - 21st.dev 스타일 리디자인
// shadcn/ui 기반 모던 네비게이션
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home as HomeIcon, TrendingUp, BookOpen, Briefcase, Library, User,
  Moon, Sun, Menu, X, ChevronRight, Tv, Shield
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  available: boolean;
  description?: string;
}

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  isSimulationMode?: boolean;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

// ============================================
// Menu Items
// ============================================

const MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon, href: '/', available: true },
  { id: 'market', label: 'Market', icon: TrendingUp, href: '/market', available: true, description: 'AI 노드 관제' },
  { id: 'infra', label: 'Infra', icon: Tv, href: '/infra', available: true, description: '채널 편성표' },
  { id: 'poc', label: 'POC', icon: Briefcase, href: '/poc', available: true, description: 'Kernel 테스트' },
  { id: 'admin', label: 'Admin', icon: Shield, href: '/admin', available: true, description: '관리자 대시보드' },
];

// ============================================
// Header Component
// ============================================

export function Header({ 
  isDark, 
  onToggleTheme, 
  isSimulationMode,
  currentView,
  onViewChange,
}: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 모바일 메뉴 열림 시 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // 메뉴 아이템 클릭 핸들러
  const handleMenuClick = useCallback((item: MenuItem) => {
    setMobileMenuOpen(false);
    if (onViewChange && !item.href) {
      onViewChange(item.id);
    }
  }, [onViewChange]);

  // 현재 활성 메뉴 확인
  const isActive = (item: MenuItem) => {
    if (item.href === pathname) return true;
    if (item.href && pathname?.startsWith(item.href) && item.href !== '/') return true;
    if (currentView && item.id === currentView) return true;
    return false;
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled 
            ? 'bg-background/80 backdrop-blur-xl border-b border-border py-3' 
            : 'py-4'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/"
            className="flex items-center gap-1 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="text-2xl font-bold text-primary">DoAi</span>
            <span className="text-2xl font-light text-foreground">.Me</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            <div className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-full transition-all',
              scrolled ? '' : 'bg-muted/50'
            )}>
              {MENU_ITEMS.map(item => (
                <NavLink
                  key={item.id}
                  item={item}
                  isActive={isActive(item)}
                  onClick={() => handleMenuClick(item)}
                />
              ))}
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="ml-2"
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              )}
            </Button>
          </nav>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Simulation Mode Badge */}
            {isSimulationMode && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-umbra/20 text-umbra rounded">
                SIM
              </span>
            )}

            {/* Theme Toggle (Mobile) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              aria-label={isDark ? '라이트 모드' : '다크 모드'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Hamburger Menu */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        menuItems={MENU_ITEMS}
        isActive={isActive}
        onItemClick={handleMenuClick}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}

// ============================================
// NavLink (Desktop)
// ============================================

interface NavLinkProps {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}

function NavLink({ item, isActive, onClick }: NavLinkProps) {
  const Icon = item.icon;
  
  const baseClasses = cn(
    'relative px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
    'flex items-center gap-1.5'
  );
  
  const activeClasses = cn(
    'text-primary bg-primary/10'
  );
  
  const inactiveClasses = cn(
    'text-muted-foreground hover:text-foreground hover:bg-muted'
  );
  
  const disabledClasses = cn(
    'text-muted-foreground/50 cursor-not-allowed'
  );

  if (item.href && item.available) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          baseClasses,
          isActive ? activeClasses : inactiveClasses
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {item.label}
      </Link>
    );
  }

  if (!item.available) {
    return (
      <span className={cn(baseClasses, disabledClasses)}>
        <Icon className="w-3.5 h-3.5" />
        {item.label}
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        baseClasses,
        isActive ? activeClasses : inactiveClasses
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {item.label}
    </button>
  );
}

// ============================================
// Mobile Menu
// ============================================

interface MobileMenuProps {
  isOpen: boolean;
  menuItems: MenuItem[];
  isActive: (item: MenuItem) => boolean;
  onItemClick: (item: MenuItem) => void;
  onClose: () => void;
}

function MobileMenu({ isOpen, menuItems, isActive, onItemClick, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed top-16 left-0 right-0 bottom-0 z-40 md:hidden overflow-y-auto bg-background border-t border-border">
        <div className="p-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item);

            if (item.href && item.available) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onItemClick(item)}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl transition-all',
                    active
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      active ? 'bg-primary/20' : 'bg-background'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        active ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <div className={cn(
                        'font-medium text-sm',
                        active && 'text-primary'
                      )}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                disabled={!item.available}
                onClick={() => item.available && onItemClick(item)}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-xl transition-all',
                  !item.available
                    ? 'opacity-40 cursor-not-allowed bg-muted/50'
                    : active
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-muted hover:bg-muted/80'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    active ? 'bg-primary/20' : 'bg-background'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="text-left">
                    <div className={cn(
                      'font-medium text-sm',
                      active && 'text-primary'
                    )}>
                      {item.label}
                      {!item.available && (
                        <span className="ml-2 text-xs text-umbra font-normal">준비중</span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
                {item.available && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © 2024 DoAi.Me. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
