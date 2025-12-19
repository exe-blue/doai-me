'use client';

import { Lightbulb, Clock, Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function IdeasGeneratorPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-400" />
          아이디어 생성
        </h1>
        <p className="text-zinc-400 text-sm">AI 기반 콘텐츠 아이디어 생성</p>
      </div>

      {/* 개발 예정 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-16 text-center">
          <Construction className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <Badge className="bg-yellow-500/20 text-yellow-400 border-0 mb-4">
            <Clock className="w-3 h-3 mr-1" />
            개발 예정
          </Badge>
          <h3 className="text-xl font-medium text-zinc-300 mb-2">AI 아이디어 생성 기능</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            트렌드 기반 콘텐츠 아이디어, 제목 생성, 썸네일 컨셉, 
            스크립트 아웃라인 등 AI 기반 콘텐츠 기획 지원 기능이 추가될 예정입니다.
          </p>
          
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="bg-zinc-800">제목 생성</Badge>
            <Badge variant="secondary" className="bg-zinc-800">썸네일 컨셉</Badge>
            <Badge variant="secondary" className="bg-zinc-800">스크립트 아웃라인</Badge>
            <Badge variant="secondary" className="bg-zinc-800">태그 추천</Badge>
            <Badge variant="secondary" className="bg-zinc-800">설명 생성</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
