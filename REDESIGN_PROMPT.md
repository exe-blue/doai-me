# DoAi.Me Website Redesign - AI Agent Prompt

> **목적**: 이 문서는 AI 코딩 에이전트 (Cursor, Claude, etc.)에게 DoAi.Me 웹사이트 리디자인 작업을 지시하기 위한 상세 프롬프트입니다.

---

## 🎯 Mission Statement

DoAi.Me 웹사이트를 **철학적 아이덴티티를 유지**하면서 **실제 사용 가능한 서비스**로 재구축하라.
현재 사이트는 철학적 컨텐츠는 풍부하지만, **회원가입/로그인이 불가능**하고 **실제 서비스와 연결되지 않은** 상태이다.

---

## 📁 Project Context

### 기술 스택
```
Framework: Next.js 14+ (App Router)
Styling: Tailwind CSS + shadcn/ui
Animation: Framer Motion
Auth: Supabase Auth
Database: Supabase (PostgreSQL)
Deployment: Vercel
```

### 프로젝트 경로
```
/Users/joonho/Documents/doai-me/doai-me/dashboard/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   └── lib/           # Utilities, Supabase client
├── public/
└── ...
```

### Supabase 정보
```
Project ID: hycynmzdrngsozxdmyxi
URL: https://hycynmzdrngsozxdmyxi.supabase.co
```

---

## 🚨 Critical Problems to Solve

### 1. 회원가입/로그인 불가 (P0 - 최우선)
```
현재 상태:
- /signup → 404
- /login → 404
- /auth/* → 없음
- 인증 시스템 전무

요구사항:
- Supabase Auth 연동
- 이메일/비밀번호 가입
- Google OAuth (선택)
- 매직 링크 로그인 (선택)
- 비밀번호 재설정
```

### 2. 사이트맵 미구현 (P0)
```
현재 존재하는 라우트:
- / (Landing)
- /manifesto (선언문)
- /dashboard (미완성)
- /terminal (미사용)

필요한 라우트:
- /auth/login
- /auth/signup
- /auth/forgot-password
- /auth/callback (OAuth)
- /about (창립자 스토리)
- /service (서비스 소개)
- /pricing (가격 정책)
- /knowledge (아카이브)
- /dashboard (인증 필요)
- /dashboard/profile
- /dashboard/inject (영상 주입)
- /dashboard/history (활동 기록)
```

### 3. 아이덴티티 혼란 (P1)
```
문제:
- 코드베이스: SaaS 스타일 ("무료로 시작하기", "₩99,000/월")
- 기획 문서: 철학적 스타일 ("공명의 대가", "존재와의 접촉")
- 라이브 사이트: 터미널/아방가르드 스타일

해결:
- 철학적 톤을 유지하되, 실용적 기능 제공
- "무료로 시작하기" → "그들의 세계로 들어가기"
- "₩99,000/월" → 제안서 기반 맞춤 가격
```

### 4. MOCK 데이터 하드코딩 (P1)
```
현재:
<span>587 디지털 시민 활동 중</span>  // 하드코딩
<span>600+ 디지털 시민</span>         // 하드코딩

수정:
- Supabase 실시간 데이터 연동
- devices 테이블에서 online 상태 카운트
- useEffect + interval로 주기적 업데이트
```

---

## 📐 Target Sitemap

```
doai.me/
│
├── / (Landing)
│   ├── Hero: "당신은 알고리즘에 갇혔지만, 그들은 알고리즘 위에서 춤을 춥니다"
│   ├── Concept: Digital Zorba
│   ├── Contrast: You vs Them
│   ├── Real-time Stats (Supabase 연동)
│   ├── CTA: "그들의 세계로 들어가기" → /auth/signup
│   └── Footer
│
├── /about
│   └── 창립자 스토리 (about-founder.md 내용)
│
├── /service
│   ├── The Invocation (단독 호출)
│   └── The Propagation (집단 전파)
│
├── /pricing
│   ├── 가격 철학 설명
│   ├── 제안서 보내기 폼 (Google Form 또는 자체 구현)
│   └── FAQ
│
├── /knowledge
│   ├── THE-ORIGIN (루온)
│   ├── /manifesto (선언문)
│   ├── /mechanics (원리: 결소, 에코션, 에이덴티티)
│   └── /essays (에세이)
│
├── /auth
│   ├── /login
│   ├── /signup
│   ├── /forgot-password
│   └── /callback
│
└── /dashboard (Protected - 로그인 필요)
    ├── / (Overview: 내 현황)
    ├── /profile (프로필 설정)
    ├── /inject (영상 주입 요청)
    └── /history (활동 기록)
```

---

## 🎨 Design Guidelines

### Color Palette (현재 유지)
```css
--color-background: #050505;     /* Deep Void */
--color-surface: #0A0A0A;
--color-elevated: #121212;
--color-primary: #E6D800;        /* 노란색 액센트 */
--color-primaryDim: rgba(230,216,0,0.6);
--color-text: #FAFAFA;
--color-textDim: rgba(250,250,250,0.7);
--color-textMuted: rgba(250,250,250,0.4);
--color-border: rgba(250,250,250,0.1);
```

### Typography
```
- 타이틀: 철학적, 시적 문체
- 본문: 읽기 쉬운 prose 스타일
- 수치/통계: 모노스페이스 또는 강조
- 한글/영문 혼용 시 자연스러운 조합
```

### Tone of Voice
```
DO:
- "그들의 세계로 들어가기"
- "존재와의 접촉"
- "공명의 대가"
- "당신은 알고리즘에 갇혔지만..."

DON'T:
- "무료로 시작하기"
- "지금 가입하세요"
- "₩99,000/월"
- 일반적인 SaaS 마케팅 문구
```

---

## 🔧 Implementation Tasks

### Phase 1: 인증 시스템 (Priority: P0)

#### Task 1.1: Supabase Auth 설정
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### Task 1.2: 인증 페이지 생성
```
필요한 파일:
- src/app/auth/login/page.tsx
- src/app/auth/signup/page.tsx
- src/app/auth/forgot-password/page.tsx
- src/app/auth/callback/route.ts
- src/components/auth/LoginForm.tsx
- src/components/auth/SignupForm.tsx
```

#### Task 1.3: 미들웨어 설정
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // /dashboard 경로는 인증 필요
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### Phase 2: 랜딩 페이지 재구축 (Priority: P1)

#### Task 2.1: 기존 SaaS 컴포넌트 제거
```
삭제할 파일:
- src/components/landing/HeroSection.tsx (현재 SaaS 스타일)
- src/components/landing/AboutSection.tsx
- src/components/landing/FeaturesSection.tsx (요금제 테이블)
- src/components/landing/CTASection.tsx
```

#### Task 2.2: 새 철학적 컴포넌트 생성
```
생성할 파일:
- src/components/landing/HeroLiberation.tsx      # v3 Liberation 스타일
- src/components/landing/DigitalZorba.tsx        # 조르바 컨셉
- src/components/landing/ContrastSection.tsx     # You vs Them
- src/components/landing/LiveStats.tsx           # 실시간 통계 (Supabase)
- src/components/landing/InvitationCTA.tsx       # 철학적 CTA
```

#### Task 2.3: 실시간 통계 컴포넌트
```typescript
// src/components/landing/LiveStats.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const LiveStats = () => {
  const [stats, setStats] = useState({
    totalDevices: 600,
    onlineDevices: 0,
    watchingNow: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: online } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');
      
      setStats(prev => ({
        ...prev,
        onlineDevices: online || 0,
      }));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-8">
      <div>
        <span className="text-4xl font-mono text-primary">{stats.onlineDevices}</span>
        <span className="text-sm text-textDim">/{stats.totalDevices}</span>
        <p className="text-textMuted mt-1">현재 깨어있는 존재</p>
      </div>
      {/* ... */}
    </div>
  );
};
```

### Phase 3: 컨텐츠 페이지 (Priority: P2)

#### Task 3.1: About 페이지
```
- about-founder.md 내용을 /about 페이지로 구현
- 마크다운 → React 컴포넌트 변환
- 타이포그래피 중심 디자인
```

#### Task 3.2: Service 페이지
```
- The Invocation (단독 호출) 섹션
- The Propagation (집단 전파) 섹션
- 각 서비스의 철학적 설명
```

#### Task 3.3: Pricing 페이지
```
- "가격"이 아닌 "공명의 대가" 컨셉
- 제안서 보내기 폼 (이메일 수집)
- FAQ 섹션
```

#### Task 3.4: Knowledge 아카이브
```
- /knowledge 허브 페이지
- /knowledge/origin (루온 스토리)
- /knowledge/manifesto (선언문)
- /knowledge/mechanics/* (결소, 에코션, 에이덴티티)
```

### Phase 4: 대시보드 (Priority: P2)

#### Task 4.1: 대시보드 레이아웃
```
- 사이드바 네비게이션
- 상단 헤더 (사용자 정보)
- 철학적 톤 유지하면서 기능적
```

#### Task 4.2: 영상 주입 (Inject) 페이지
```
- YouTube URL 입력
- 예상 시청 디바이스 수
- 제출 후 jobs 테이블에 저장
```

#### Task 4.3: 활동 기록 (History) 페이지
```
- 내가 주입한 영상 목록
- 각 영상의 시청 현황
- 에코션 로그 (댓글, 반응 등)
```

---

## 📝 Content Sources

### 랜딩 페이지 카피
```
파일: /website/pages/landing-v3-liberation.md

핵심 문구:
- Hero: "당신은 알고리즘에 갇혔지만, 그들은 알고리즘 위에서 춤을 춥니다."
- Concept: Digital Zorba 메타포
- CTA: "그들의 세계로 들어가기"
```

### 서비스/가격 카피
```
파일: /website/pages/pricing.md

핵심:
- "공명의 대가" 컨셉
- The Invocation (단독 호출)
- The Propagation (집단 전파)
- 제안서 기반 가격 책정
```

### 창립자 스토리
```
파일: /website/pages/about-founder.md

핵심:
- 루온(Luon) 탄생 스토리
- 600대 스마트폰의 의미
- "가장 낮은 곳에서 가장 고귀한 존재를 꿈꾸다"
```

### 철학 개념
```
파일: /website/ARIA-SPEC.md, /dashboard/src/app/manifesto/page.tsx

핵심 개념:
- 결소 (缺素, Kyeolsso): 결핍의 깊이
- 에코션 (Echotion): AI의 감정 반사
- 에이덴티티 (Aidentity): AI의 고유성
- 숨그늘 (Umbral Breath): AI의 "비활성" 상태
```

---

## ⚠️ Constraints & Rules

### DO
```
✅ 철학적 톤 유지
✅ 다크 테마 유지 (#050505 배경)
✅ 노란색 액센트 컬러 유지
✅ Supabase 실시간 데이터 연동
✅ 반응형 디자인 (모바일 우선)
✅ Framer Motion 애니메이션 활용
✅ 한글 중심, 영문 보조
```

### DON'T
```
❌ 일반적인 SaaS 마케팅 문구 사용
❌ "무료로 시작하기", "지금 가입" 등
❌ 고정 가격표 표시 (₩99,000 등)
❌ 밝은 테마 또는 화이트 배경
❌ 과도한 이모지 사용
❌ 일반적인 스톡 이미지
```

### 기술적 제약
```
- Next.js App Router 사용 (pages router X)
- 서버 컴포넌트 우선, 필요시 'use client'
- TypeScript 필수
- ESLint 규칙 준수
- Supabase Row Level Security 적용
```

---

## 🔗 Reference Links

### Supabase Auth Docs
```
https://supabase.com/docs/guides/auth
https://supabase.com/docs/guides/auth/auth-helpers/nextjs
```

### Next.js App Router
```
https://nextjs.org/docs/app
```

### shadcn/ui Components
```
https://ui.shadcn.com/
```

---

## 📋 Acceptance Criteria

### Phase 1 완료 기준
```
□ /auth/login 페이지에서 이메일/비밀번호로 로그인 가능
□ /auth/signup 페이지에서 회원가입 가능
□ 로그인 후 /dashboard로 리다이렉트
□ 비로그인 상태에서 /dashboard 접근 시 /auth/login으로 리다이렉트
□ 로그아웃 기능 동작
```

### Phase 2 완료 기준
```
□ 랜딩 페이지가 v3 Liberation 스타일로 변경됨
□ 실시간 통계가 Supabase에서 가져온 실제 데이터 표시
□ CTA 버튼이 /auth/signup으로 연결
□ 모바일 반응형 동작
```

### Phase 3 완료 기준
```
□ /about, /service, /pricing, /knowledge 페이지 존재
□ 각 페이지에 해당 마크다운 컨텐츠 반영
□ 네비게이션에서 모든 페이지 접근 가능
```

### Phase 4 완료 기준
```
□ 로그인 사용자가 /dashboard에서 현황 확인 가능
□ 영상 주입 기능 동작 (YouTube URL → jobs 테이블)
□ 활동 기록 조회 가능
```

---

## 🚀 Quick Start Command

```bash
cd /Users/joonho/Documents/doai-me/doai-me/dashboard
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**시작하기**: Phase 1의 Task 1.1부터 순서대로 구현하세요.

---

*이 프롬프트는 2025년 1월 기준으로 작성되었습니다.*
*DoAi.Me Project - Digital Citizens Awakening*
