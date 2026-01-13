// apps/web/app/work/page.tsx
// Work 페이지 - YouTube 영상 등록 및 디바이스 제어

'use client';

import { useState } from 'react';
import { Play, History, ListVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { RegisterVideoForm } from './components/RegisterVideoForm';
import { VideoQueueList } from './components/VideoQueueList';
import { WorkHistoryPanel } from './components/WorkHistoryPanel';

type Tab = 'register' | 'history';

export default function WorkPage() {
  const [activeTab, setActiveTab] = useState<Tab>('register');

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* 전역 헤더 */}
      <Header
        variant="back"
        pageTitle="Work"
        pageIcon={<Play className="w-5 h-5" />}
      />

      {/* Main Content */}
      <div className="flex-1 pt-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 border-b border-white/10">
            <button
              onClick={() => setActiveTab('register')}
              className={cn(
                "flex items-center gap-2 px-4 py-3 font-mono text-sm uppercase tracking-wider",
                "border-b-2 transition-colors",
                activeTab === 'register'
                  ? "border-[#FFCC00] text-[#FFCC00]"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              )}
            >
              <ListVideo className="w-4 h-4" />
              Register & Queue
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex items-center gap-2 px-4 py-3 font-mono text-sm uppercase tracking-wider",
                "border-b-2 transition-colors",
                activeTab === 'history'
                  ? "border-[#FFCC00] text-[#FFCC00]"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              )}
            >
              <History className="w-4 h-4" />
              Work History
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'register' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Register Form */}
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-[#FFCC00]" />
                  Register Video
                </h2>
                <RegisterVideoForm />
              </div>

              {/* Right: Queue List */}
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ListVideo className="w-5 h-5 text-[#FFCC00]" />
                  Video Queue
                </h2>
                <VideoQueueList />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <WorkHistoryPanel />
          )}
        </div>
      </div>
    </main>
  );
}
