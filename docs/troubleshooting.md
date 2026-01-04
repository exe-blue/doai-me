# Troubleshooting Guide

> 일반적인 문제 해결 가이드

---

## 목차
1. [연결 문제](#연결-문제)
2. [디바이스 문제](#디바이스-문제)
3. [성능 문제](#성능-문제)
4. [AutoX.js 문제](#autoxjs-문제)

---

## 연결 문제

### 노드가 Orchestrator에 연결되지 않음

**증상:**
- WebSocket 연결 실패
- 노드 상태가 "offline"

**진단:**
```bash
# 1. Tailscale 연결 확인
tailscale status

# 2. Orchestrator 접근 확인
curl -v https://api.doai.me/health

# 3. 노드 로그 확인
journalctl -u doai-node-runner -n 100
```

**해결:**
1. Tailscale 연결 확인 및 재연결
2. `ORCH_NODE_TOKEN` 확인
3. 방화벽 규칙 확인
4. 노드 서비스 재시작

---

### WebSocket 연결이 자주 끊김

**증상:**
- 연결 후 수분 내 끊김
- "Connection reset" 에러

**원인:**
- 네트워크 불안정
- Heartbeat 타임아웃
- Caddy 타임아웃 설정

**해결:**
```bash
# Caddy 설정 확인
# 긴 연결 허용 설정 추가
```

---

## 디바이스 문제

### 디바이스가 인식되지 않음

**증상:**
- `adb devices` 빈 목록
- 디바이스 상태 "disconnected"

**진단:**
```bash
# ADB 재시작
adb kill-server && adb start-server
adb devices -l

# USB 허브 확인
lsusb
```

**해결:**
- [ADB Runbook](../orion/runbooks/adb.md) 참조
- USB 케이블/허브 교체
- USB 디버깅 재활성화

---

### 디바이스가 "unauthorized" 상태

**증상:**
- `adb devices`에서 "unauthorized"

**해결:**
```bash
# ADB 키 재생성
rm -rf ~/.android/adbkey*
adb kill-server
adb start-server
# 디바이스 화면에서 승인
```

---

### 디바이스 화면이 꺼짐

**증상:**
- 자동화 스크립트 실패
- 화면 입력 불가

**해결:**
```bash
# 화면 항상 켜짐 설정
adb -s <device-id> shell settings put global stay_on_while_plugged_in 3

# 화면 켜기
adb -s <device-id> shell input keyevent KEYCODE_WAKEUP
```

---

## 성능 문제

### 응답 지연

**증상:**
- API 응답 느림 (>2초)
- WebSocket 메시지 지연

**진단:**
```bash
# Orchestrator 리소스 확인
htop

# 데이터베이스 연결 확인
# Supabase 대시보드에서 연결 수 확인
```

**해결:**
1. Orchestrator 리소스 증설
2. 데이터베이스 쿼리 최적화
3. 연결 풀 설정 조정

---

### 메모리 부족

**증상:**
- 서비스 OOM Kill
- 응답 없음

**진단:**
```bash
# 메모리 사용량
free -h

# 서비스별 사용량
systemctl status doai-orchestrator
```

**해결:**
```bash
# Systemd 메모리 제한 조정
# /etc/systemd/system/doai-orchestrator.service
# MemoryMax=2G
systemctl daemon-reload
systemctl restart doai-orchestrator
```

---

## AutoX.js 문제

### 스크립트가 실행되지 않음

**증상:**
- 스크립트 시작 후 즉시 종료
- 에러 로그 없음

**진단:**
```bash
# AutoX.js 로그 확인
adb -s <device-id> logcat -s AutoX:*

# 앱 상태 확인
adb -s <device-id> shell dumpsys package org.autojs.autoxjs
```

**해결:**
1. AutoX.js 앱 강제 종료 후 재시작
2. 접근성 서비스 재활성화
3. 스크립트 문법 오류 확인

---

### 접근성 서비스 비활성화

**증상:**
- "접근성 서비스가 필요합니다" 에러
- UI 자동화 실패

**해결:**
```bash
# 접근성 서비스 활성화 (ADB)
adb -s <device-id> shell settings put secure enabled_accessibility_services org.autojs.autoxjs/.AccessibilityService
adb -s <device-id> shell settings put secure accessibility_enabled 1
```

---

### 앱이 찾아지지 않음

**증상:**
- `findOne()` 반환 null
- UI 요소 탐색 실패

**원인:**
- 앱 UI 변경
- 로딩 지연

**해결:**
```javascript
// 타임아웃 증가
let element = findOne(selector, 10000);

// 대기 추가
sleep(2000);

// 여러 selector 시도
let element = findOne(selector1) || findOne(selector2);
```

---

## 로그 수집

문제 보고 시 다음 로그를 첨부하세요:

```bash
# Orchestrator 로그
journalctl -u doai-orchestrator -n 200 --no-pager > orchestrator.log

# Node Runner 로그
journalctl -u doai-node-runner -n 200 --no-pager > node-runner.log

# 디바이스 로그
adb -s <device-id> logcat -d > device.log
```

---

## 관련 문서

- [ADB Runbook](../orion/runbooks/adb.md)
- [Recovery Runbook](../orion/runbooks/recover.md)
- [Tailscale Runbook](../orion/runbooks/tailscale.md)

