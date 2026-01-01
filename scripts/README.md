# Scripts 구조

**업데이트**: 2026-01-02  
**정리**: Laixi vs Backend/DB 스크립트 분리

---

## 📁 디렉토리 구조

```
scripts/
├── local/          # 로컬 PC에서 실행 (Backend/DB 작업)
├── infra/          # 인프라/배포 스크립트 (SSH, Setup)
└── shared/         # 공유 라이브러리
```

---

## 🎯 scripts/local/ (Backend/DB 작업)

**목적**: 데이터베이스와 API 연동 작업

| 파일 | 설명 | 실행 환경 |
|------|------|----------|
| `local-register_devices-cli.py` | ADB 기기를 Supabase에 등록 | PC (Python) |
| `local-orchestrate_video_assignments-cli.py` | 영상을 디바이스에 할당 | PC (Python) |
| `local-sync_gsheet_videos-cli.py` | Google Sheets → Supabase 동기화 | PC (Python) |
| `local-sync_completion_to_gsheet-cron.py` | 완료 정보 → Google Sheets | PC (Python, Cron) |

### 사용 예시

```bash
# 1. 디바이스 등록
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_key"
export BOARD_NUMBER="1"
python scripts/local/local-register_devices-cli.py

# 2. 영상 할당
python scripts/local/local-orchestrate_video_assignments-cli.py --video-id <uuid>

# 3. Google Sheets 동기화
export GOOGLE_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"
python scripts/local/local-sync_gsheet_videos-cli.py --spreadsheet-id <id>
```

---

## 🚀 scripts/infra/ (인프라/배포)

**목적**: 서버 배포, 설정, 관리

| 파일 | 설명 | 실행 환경 |
|------|------|----------|
| `local-init_devices-cli.{bat,sh}` | ADB 기기 초기화 | PC (Shell) |
| `local-setup_caddy-ops.sh` | Caddy 웹서버 설정 | PC → SSH |
| `local-ssh_check_services-ops.py` | 원격 서비스 상태 체크 | PC → SSH |
| `local-ssh_deploy_all-ops.py` | 전체 서비스 배포 | PC → SSH |
| `local-ssh_fix_n8n-ops.py` | n8n 워크플로우 수정 | PC → SSH |
| `local-ssh_setup_caddy-ops.py` | Caddy 설정 (Python) | PC → SSH |

### 사용 예시

```bash
# 디바이스 초기화
bash scripts/infra/local-init_devices-cli.sh

# 서비스 배포
python scripts/infra/local-ssh_deploy_all-ops.py

# 서비스 상태 체크
python scripts/infra/local-ssh_check_services-ops.py
```

---

## 📚 scripts/shared/ (공유 라이브러리)

**목적**: 중복 코드 제거, 재사용성 향상

| 파일 | 설명 |
|------|------|
| `shared_supabase_lib.py` | Supabase REST API 헬퍼 |
| `shared_gsheet_lib.py` | Google Sheets API 헬퍼 |

### 사용 예시

```python
# Supabase 라이브러리
from scripts.shared.shared_supabase_lib import supabase_get, supabase_post

videos = supabase_get("videos", {"status": "eq.pending"})
supabase_post("videos", [{"url": "...", "status": "pending"}])

# Google Sheets 라이브러리
from scripts.shared.shared_gsheet_lib import load_videos_sheet, update_videos_row

rows = load_videos_sheet(spreadsheet_id)
update_videos_row(spreadsheet_id, row_number, {"status": "completed"})
```

---

## 🔄 autox-scripts/ (Laixi 안드로이드)

**별도 폴더**: `autox-scripts/`

**목적**: 안드로이드 폰에서 YouTube 자동화 실행

자세한 내용은 `autox-scripts/README.md` 참고

---

## 🎯 명명 규칙

```
{scope}-{name}-{type}.{ext}

scope:
  - local: 로컬 PC에서 실행
  - remote: 원격 서버에서 실행 (deprecated)
  - shared: 공유 라이브러리

name:
  - register_devices
  - orchestrate_video_assignments
  - sync_gsheet_videos
  - etc.

type:
  - cli: 사용자가 직접 실행하는 CLI 도구
  - ops: 운영/배포 스크립트 (SSH, Setup)
  - cron: 주기적으로 실행되는 스크립트
  - lib: 라이브러리 (shared만 해당)
```

### 예시

- `local-register_devices-cli.py` - 로컬에서 실행하는 CLI 도구
- `local-ssh_deploy_all-ops.py` - SSH로 원격 배포하는 운영 스크립트
- `shared_supabase_lib.py` - 공유 라이브러리

---

## 🔧 환경 변수

### Supabase

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Google Sheets

```bash
export GOOGLE_SERVICE_ACCOUNT_FILE="/path/to/service-account.json"
```

### ADB

```bash
export ADB_BIN="adb"  # ADB 경로 (기본: adb)
export BOARD_NUMBER="1"  # 폰보드 번호
```

---

## 📦 의존성

```bash
# Python 패키지
pip install requests google-api-python-client google-auth

# 또는
pip install -r requirements.txt
```

---

**관리**: Axon (Tech Lead)  
**업데이트**: 2026-01-02
