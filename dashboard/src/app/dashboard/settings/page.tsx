"use client";

import { useState } from 'react';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { themes, ThemeName } from '@/lib/theme';
import { Check, Moon, Palette, Bell, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  const { themeName, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl theme-text font-medium">설정</h1>

      {/* 테마 설정 */}
      <section className="theme-surface border theme-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 theme-primary" />
          <h2 className="text-lg theme-text font-medium">테마</h2>
        </div>
        <p className="text-sm theme-text-dim mb-4">
          대시보드의 색상 테마를 선택하세요.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(themes) as ThemeName[]).map((name) => {
            const theme = themes[name];
            const isSelected = themeName === name;
            return (
              <button
                key={name}
                onClick={() => setTheme(name)}
                className={`p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'theme-border hover:border-[var(--color-primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  {isSelected && (
                    <Check className="w-4 h-4 text-[var(--color-primary)]" />
                  )}
                </div>
                <p className="text-sm theme-text text-left">{theme.name}</p>
                <p className="text-xs theme-text-muted text-left">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 알림 설정 */}
      <section className="theme-surface border theme-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 theme-primary" />
          <h2 className="text-lg theme-text font-medium">알림</h2>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="theme-text text-sm">브라우저 알림</p>
              <p className="theme-text-muted text-xs">
                태스크 완료 시 알림을 받습니다
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-[var(--color-primary)]' : 'theme-elevated'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="theme-text text-sm">자동 새로고침</p>
              <p className="theme-text-muted text-xs">
                대시보드 데이터를 30초마다 갱신합니다
              </p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-12 h-6 rounded-full transition-colors ${
                autoRefresh ? 'bg-[var(--color-primary)]' : 'theme-elevated'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      </section>

      {/* 데이터 설정 */}
      <section className="theme-surface border theme-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 theme-primary" />
          <h2 className="text-lg theme-text font-medium">데이터</h2>
        </div>
        <div className="space-y-3">
          <button className="w-full text-left p-3 theme-elevated rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors">
            <p className="theme-text text-sm">캐시 초기화</p>
            <p className="theme-text-muted text-xs">
              로컬에 저장된 캐시 데이터를 삭제합니다
            </p>
          </button>
          <button className="w-full text-left p-3 theme-elevated rounded-lg hover:bg-[var(--color-error)]/10 transition-colors">
            <p className="text-[var(--color-error)] text-sm">모든 데이터 삭제</p>
            <p className="theme-text-muted text-xs">
              주의: 이 작업은 되돌릴 수 없습니다
            </p>
          </button>
        </div>
      </section>

      {/* 보안 설정 */}
      <section className="theme-surface border theme-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 theme-primary" />
          <h2 className="text-lg theme-text font-medium">보안</h2>
        </div>
        <div className="space-y-3">
          <button className="w-full text-left p-3 theme-elevated rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors">
            <p className="theme-text text-sm">세션 관리</p>
            <p className="theme-text-muted text-xs">
              활성 세션을 확인하고 관리합니다
            </p>
          </button>
          <button className="w-full text-left p-3 theme-elevated rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors">
            <p className="theme-text text-sm">API 키 관리</p>
            <p className="theme-text-muted text-xs">
              API 액세스 키를 생성하고 관리합니다
            </p>
          </button>
        </div>
      </section>

      {/* 버전 정보 */}
      <div className="text-center py-4">
        <p className="theme-text-muted text-xs font-mono">
          DoAi.Me Dashboard v0.1.0-alpha
        </p>
      </div>
    </div>
  );
}
