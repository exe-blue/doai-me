"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { themes, ThemeName } from '@/lib/theme';
import { LogOut, Palette, ChevronDown, User } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface DashboardHeaderProps {
  user: SupabaseUser | null;
}

export const DashboardHeader = ({ user }: DashboardHeaderProps) => {
  const router = useRouter();
  const { themeName, setTheme } = useTheme();
  const [showTheme, setShowTheme] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/');
  };

  return (
    <header className="h-16 theme-surface border-b theme-border flex items-center justify-between px-6">
      <div className="text-sm theme-text-dim font-mono">
        {new Date().toLocaleDateString('ko-KR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTheme(!showTheme)}
            className="flex items-center gap-2 px-3 py-1.5 theme-elevated rounded theme-text-dim hover:theme-text"
          >
            <Palette className="w-4 h-4" />
            <span className="text-xs font-mono">{themes[themeName].name}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showTheme && (
            <div className="absolute right-0 mt-2 w-48 theme-surface border theme-border rounded-lg shadow-xl z-50">
              {(Object.keys(themes) as ThemeName[]).map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => { setTheme(name); setShowTheme(false); }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-elevated)] ${
                    name === themeName ? 'text-[var(--color-primary)]' : 'theme-text-dim'
                  }`}
                >
                  <span className="font-medium">{themes[name].name}</span>
                  <span className="block text-xs theme-text-muted">
                    {themes[name].description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 theme-text-dim">
          <User className="w-4 h-4" />
          <span className="text-sm">{user?.email || 'Unknown'}</span>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded theme-elevated hover:bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  );
};
