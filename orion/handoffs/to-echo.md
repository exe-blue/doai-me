# Handoff: To Echo (Operations)

> 이 문서는 Echo(운영 담당)에게 전달하는 운영 컨텍스트입니다.

---

## 현재 인프라 상태

### 서버
| 서비스 | 위치 | 상태 | URL |
|--------|------|------|-----|
| Orchestrator | Vultr | [ACTIVE] | https://api.doai.me |
| Web Dashboard | Vercel | [ACTIVE] | https://doai.me |
| Database | Supabase | [ACTIVE] | - |

### 노드
- 활성 노드: [N]대
- 비활성 노드: [N]대
- 마지막 점검: YYYY-MM-DD

---

## 모니터링 포인트

### Health Check
- [ ] Orchestrator `/health` 응답 확인
- [ ] 노드 WebSocket 연결 상태
- [ ] Supabase 연결 상태

### 알람 설정
- (현재 알람 설정 내용)

---

## 주요 런북

| 상황 | 런북 |
|------|------|
| 서버 다운 | [recover.md](./runbooks/recover.md) |
| Caddy 설정 | [caddy.md](./runbooks/caddy.md) |
| ADB 문제 | [adb.md](./runbooks/adb.md) |
| Tailscale | [tailscale.md](./runbooks/tailscale.md) |

---

## 예정된 작업

- [ ] (예정 작업)

---

## 긴급 연락처

- (연락처 정보)

---

_Last updated: YYYY-MM-DD by @이름_

