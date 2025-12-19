'use client';

import { TrendingUp, Clock, Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TrendsReportPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-cyan-400" />
          트렌드 리포트
        </h1>
        <p className="text-zinc-400 text-sm">실시간 YouTube 트렌드 분석</p>
      </div>

      {/* 개발 예정 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-16 text-center">
          <Construction className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <Badge className="bg-yellow-500/20 text-yellow-400 border-0 mb-4">
            <Clock className="w-3 h-3 mr-1" />
            개발 예정
          </Badge>
          <h3 className="text-xl font-medium text-zinc-300 mb-2">트렌드 리포트 기능</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            실시간 인기 급상승 영상, 카테고리별 트렌드, 주간/월간 리포트 등
            다양한 트렌드 분석 기능이 추가될 예정입니다.
          </p>
          
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="bg-zinc-800">인기 급상승</Badge>
            <Badge variant="secondary" className="bg-zinc-800">카테고리별 분석</Badge>
            <Badge variant="secondary" className="bg-zinc-800">주간 리포트</Badge>
            <Badge variant="secondary" className="bg-zinc-800">월간 리포트</Badge>
            <Badge variant="secondary" className="bg-zinc-800">키워드 트렌드</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
