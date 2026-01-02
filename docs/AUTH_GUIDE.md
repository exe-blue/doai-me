# 인증 시스템 가이드

**Orion's Directive**: "공유 토큰은 위험하므로 Admin/NODE 토큰 분리한다."

---

## 🔐 토큰 체계

### 2가지 토큰

| 토큰 | 용도 | 접근 가능 API |
|------|------|---------------|
| **ADMIN_TOKEN** | Vercel Dashboard, 관리자 | `/ops/emergency/*`, `/monitoring/*`, `/nodes`, `/jobs` |
| **NODE_TOKEN** | T5810 NodeRunner | WebSocket `/node` (향후) |

---

## 🔑 토큰 생성

### 안전한 랜덤 토큰 생성

```bash
cd /opt/doai-me/orchestrator
source venv/bin/activate
python -c "from auth import generate_secure_token; print('ADMIN_TOKEN=' + generate_secure_token()); print('NODE_TOKEN=' + generate_secure_token())"
```

**출력 예시**:
```
ADMIN_TOKEN=abc123def456...
NODE_TOKEN=xyz789uvw012...
```

---

## ⚙️ 설정

### .env 파일

```bash
# orchestrator/.env 생성
cat > /opt/doai-me/orchestrator/.env << 'EOF'
# 인증 토큰
ADMIN_TOKEN=abc123def456...  # 위에서 생성한 값
NODE_TOKEN=xyz789uvw012...   # 위에서 생성한 값

# Supabase
SUPABASE_URL=https://hycynmzdrngsozxdmyxi.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw

# 서버
NODE_ENV=production
EOF
```

### systemd EnvironmentFile

```ini
[Service]
EnvironmentFile=/opt/doai-me/orchestrator/.env
```

---

## 📡 API 사용법

### Admin API (인증 필요)

```bash
# Admin 토큰 설정
export ADMIN_TOKEN="abc123def456..."

# Emergency Recovery
curl -X POST https://doai.me:8443/ops/emergency/request \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "TITAN-01",
    "level": "soft",
    "reason": "Test"
  }'

# 노드 목록
curl https://doai.me:8443/nodes \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 모니터링
curl https://doai.me:8443/monitoring/network \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 무인증 API

```bash
# Health Check (무인증)
curl https://doai.me:8443/health
```

---

## 🔒 보안

### Critical Constraints

✅ **Outbound Only**: 모든 클라이언트는 Vultr로 outbound만  
✅ **Bearer Token**: Authorization 헤더로 인증  
✅ **토큰 분리**: Admin ≠ Node  
✅ **HTTPS Only**: 프로덕션에서는 HTTPS 필수

### 토큰 보안

```bash
# 토큰 유출 시 즉시 재생성
python -c "from auth import generate_secure_token; print(generate_secure_token())"

# .env 업데이트
vi /opt/doai-me/orchestrator/.env

# 재시작
systemctl restart doai-orchestrator
```

---

## 🧪 테스트

### 인증 성공

```bash
curl https://doai.me:8443/nodes \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# → 200 OK
# → {"nodes": [...]}
```

### 인증 실패

```bash
curl https://doai.me:8443/nodes \
  -H "Authorization: Bearer wrong-token"

# → 401 Unauthorized
# → {"detail": "Unauthorized: Invalid admin token"}
```

### 무인증 시도

```bash
curl https://doai.me:8443/nodes

# → 403 Forbidden
# → {"detail": "Not authenticated"}
```

---

## 📋 체크리스트

### Vultr 서버

- [ ] 토큰 생성 (`python auth.py`)
- [ ] `.env` 파일 생성 및 토큰 설정
- [ ] Orchestrator 재시작
- [ ] API 테스트 (인증 포함)

### Vercel Dashboard

- [ ] 환경 변수 설정
  - `NEXT_PUBLIC_API_URL=https://doai.me:8443`
  - `ADMIN_TOKEN=<생성한 토큰>`

### NodeRunner (T5810)

- [ ] 환경 변수 설정
  - `NODE_TOKEN=<생성한 토큰>`
- [ ] WSS 연결 시 토큰 전송 (향후 구현)

---

**작성**: Axon (Builder)  
**날짜**: 2026-01-02
