# Security Guide

> DoAi.Me 시스템 보안 가이드라인

## 원칙

1. **최소 권한:** 각 컴포넌트는 필요한 최소한의 권한만 가짐
2. **계층 방어:** 여러 보안 계층으로 구성
3. **비밀 분리:** 민감 정보는 코드와 분리

---

## 비밀 관리

### 절대 금지
- ❌ 코드에 하드코딩
- ❌ Git 커밋에 포함
- ❌ 로그에 출력
- ❌ 에러 메시지에 노출

### 저장 위치
| 비밀 | 저장소 |
|------|--------|
| `ORCH_ADMIN_TOKEN` | Vercel 환경변수, Vultr 환경변수 |
| `ORCH_NODE_TOKEN` | Vultr 환경변수, 노드 환경변수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Vultr 환경변수 |
| `TAILSCALE_AUTHKEY` | 노드 환경변수 |

### 토큰 생성
```bash
# 안전한 랜덤 토큰 생성 (64바이트 hex)
openssl rand -hex 32

# 또는 Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 토큰 로테이션
1. 새 토큰 생성
2. 모든 서비스에 새 토큰 배포
3. 구 토큰 무효화
4. 로그 확인

---

## 네트워크 보안

### Tailscale VPN
- 모든 노드-서버 통신은 Tailscale을 통해
- ACL로 접근 제어

### 방화벽 규칙 (Vultr)
```bash
# 허용
ufw allow 22/tcp    # SSH (Tailscale IP만)
ufw allow 80/tcp    # HTTP (Caddy)
ufw allow 443/tcp   # HTTPS (Caddy)

# 기본 거부
ufw default deny incoming
ufw enable
```

### HTTPS
- 모든 외부 API는 HTTPS 필수
- Caddy 자동 인증서 관리

---

## 인증/인가

### API 인증
```python
# 요청 예시
headers = {
    "Authorization": f"Bearer {ORCH_ADMIN_TOKEN}"
}
```

### WebSocket 인증
```python
# 연결 시 토큰 검증
async def authenticate(websocket, token):
    if token != ORCH_NODE_TOKEN:
        await websocket.close(4001, "Unauthorized")
```

### 권한 수준
| 토큰 | 권한 |
|------|------|
| `ORCH_ADMIN_TOKEN` | 전체 API 접근, 관리 기능 |
| `ORCH_NODE_TOKEN` | 노드 등록, 상태 보고, 명령 수신 |

---

## 감사 로깅

### 기록 대상
- 모든 관리 API 호출
- 인증 실패
- 권한 변경
- 설정 변경

### 로그 형식
```json
{
  "timestamp": "2026-01-04T12:00:00Z",
  "action": "api_call",
  "endpoint": "/admin/nodes",
  "user": "admin",
  "ip": "100.x.x.x",
  "result": "success"
}
```

---

## 취약점 대응

### 보고
- 보안 이슈 발견 시 비공개 채널로 보고
- GitHub Security Advisory 사용

### 대응 절차
1. 취약점 확인 및 영향 분석
2. 패치 개발 (비공개)
3. 영향받는 시스템 식별
4. 패치 배포
5. 공개 (필요 시)

---

## 체크리스트

### 배포 전
- [ ] `.env` 파일이 `.gitignore`에 있는지 확인
- [ ] 하드코딩된 비밀 없음
- [ ] 디버그 모드 비활성화
- [ ] 불필요한 포트 닫힘

### 주기적
- [ ] 토큰 로테이션 (90일)
- [ ] 접근 권한 감사
- [ ] 로그 검토
- [ ] 의존성 업데이트

---

## 관련 문서

- [Architecture](./architecture.md)
- [Tailscale Runbook](../orion/runbooks/tailscale.md)

