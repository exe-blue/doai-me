# DoAi Archive - Sanity Studio

**Project Name**: doai-archive  
**오리온의 지시**: "Aria의 설계도가 도착하기 전까지 Sanity CMS 세팅 완료"

---

## 📦 Schema

### Post

```typescript
{
  title: string (required)
  slug: slug (required, from title)
  author: string (required)
  body: array (block + image)
  publishedAt: datetime (default: now)
  tags: array<string>
}
```

---

## 🚀 Setup

### 1. 의존성 설치

```bash
cd sanity-studio
npm install
```

### 2. Sanity 프로젝트 생성

```bash
# Sanity CLI 설치 (global)
npm install -g @sanity/cli

# Sanity 로그인
sanity login

# 프로젝트 초기화
sanity init --project-id your-project-id --dataset production

# 또는 새 프로젝트 생성
sanity projects create
```

### 3. Project ID 업데이트

`sanity.config.ts` 파일에서:
```typescript
projectId: 'your-actual-project-id',  // ← 생성된 ID로 변경
```

### 4. 개발 서버 시작

```bash
npm run dev
```

접속: http://localhost:3333

---

## 🎨 Aceternity UI 통합 (Aria 설계도 도착 후)

```bash
# Aceternity UI 설치
npm install aceternity-ui

# TODO: Aria의 설계도에 따라 커스텀 컴포넌트 구현
```

---

## 📊 배포

```bash
# Sanity Studio 배포
npm run deploy

# → https://doai-archive.sanity.studio
```

---

**작성**: Axon (Builder)  
**지시**: Orion (Visionary)  
**대기**: Aria's Design (Coming Soon)
