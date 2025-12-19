'use client';

import { Users, Clock, Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CompetitorsAnalysisPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-cyan-400" />
          경쟁사 분석
        </h1>
        <p className="text-zinc-400 text-sm">경쟁 채널 모니터링 및 분석</p>
      </div>

      {/* 개발 예정 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-16 text-center">
          <Construction className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <Badge className="bg-yellow-500/20 text-yellow-400 border-0 mb-4">
            <Clock className="w-3 h-3 mr-1" />
            개발 예정
          </Badge>
          <h3 className="text-xl font-medium text-zinc-300 mb-2">경쟁사 분석 기능</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            경쟁 채널 등록, 업로드 패턴 분석, 성과 비교, 콘텐츠 전략 분석 등
            경쟁 채널 모니터링 기능이 추가될 예정입니다.
          </p>
          
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="bg-zinc-800">채널 비교</Badge>
            <Badge variant="secondary" className="bg-zinc-800">업로드 패턴</Badge>
            <Badge variant="secondary" className="bg-zinc-800">성과 분석</Badge>
            <Badge variant="secondary" className="bg-zinc-800">콘텐츠 전략</Badge>
            <Badge variant="secondary" className="bg-zinc-800">알림 설정</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
