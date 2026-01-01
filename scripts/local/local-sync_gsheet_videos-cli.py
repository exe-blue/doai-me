#!/usr/bin/env python3
"""
Sync Google Sheets Videos -> Supabase videos + video_assignments.

역할:
- Google Sheets 의 Videos 시트를 단일 소스로 사용한다.
- active=TRUE 이고 status 가 비어있거나 'new' 인 row 에 대해:
  - Supabase videos 테이블에 upsert (sheet_video_key 기준)
  - local-orchestrate_video_assignments-cli.py 를 호출하여
    target_device_count(기본 600) 만큼 video_assignments 생성
  - Sheets 행에 supabase_video_id, status, assigned_count 를 기록

환경변수:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  GOOGLE_SERVICE_ACCOUNT_FILE (shared_gsheet_lib 에서 사용)

사용 예:
  python scripts/local/local-sync_gsheet_videos-cli.py \
    --spreadsheet-id <SPREADSHEET_ID> \
    --sheet-name Videos \
    --batch-size 60 \
    --target-count 600

주의:
- 이 스크립트는 로컬에서 실행되며, Supabase Service Role Key 를 사용한다.
"""

import os
import sys
import argparse
import subprocess
from typing import Dict, Any, List, Optional

import requests

from scripts.shared.shared_gsheet_lib import load_videos_sheet, update_videos_row


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.")

REST_URL = f"{SUPABASE_URL}/rest/v1"
VIDEOS_TABLE = "videos"
ASSIGNMENTS_TABLE = "video_assignments"


def supabase_get(path: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    url = f"{REST_URL}/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    resp = requests.get(url, headers=headers, params=params or {})
    if not resp.ok:
        raise RuntimeError(f"Supabase GET 실패: {resp.status_code} {resp.text}")
    return resp.json()


def supabase_post(path: str, rows: List[Dict[str, Any]], prefer: str = "return=representation") -> List[Dict[str, Any]]:
    url = f"{REST_URL}/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }
    resp = requests.post(url, headers=headers, json=rows)
    if not resp.ok:
        raise RuntimeError(f"Supabase POST 실패: {resp.status_code} {resp.text}")
    if resp.text:
        return resp.json()
    return []


def ensure_video_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Google Sheets row 기준으로 Supabase videos row 를 upsert 하고 반환.

    - sheet_video_key 를 natural key 로 사용.
    - 이미 있으면 업데이트, 없으면 생성.
    """

    sheet_video_key = str(row.get("sheet_video_key") or "").strip()
    url = str(row.get("url") or "").strip()
    target_device_count_raw = str(row.get("target_device_count") or "").strip()

    if not sheet_video_key:
        raise RuntimeError("sheet_video_key 가 비어 있습니다 (A열).")
    if not url:
        raise RuntimeError(f"url 이 비어 있습니다 (sheet_video_key={sheet_video_key}).")

    try:
        target_device_count = int(target_device_count_raw) if target_device_count_raw else 600
    except ValueError:
        target_device_count = 600

    # 먼저 sheet_video_key 기준으로 조회
    existing = supabase_get(
        VIDEOS_TABLE,
        {"sheet_video_key": f"eq.{sheet_video_key}"},
    )

    if existing:
        video = existing[0]
        video_id = video["id"]
        # 필요 시 url/target_device_count 를 업데이트
        supabase_post(
            f"{VIDEOS_TABLE}?id=eq.{video_id}",
            [
                {
                    "id": video_id,
                    "url": url,
                    "target_device_count": target_device_count,
                }
            ],
            prefer="return=representation",
        )
        # 다시 읽어 최신 상태 반환
        updated = supabase_get(VIDEOS_TABLE, {"id": f"eq.{video_id}"})
        return updated[0]

    # 없으면 새로 생성
    created_list = supabase_post(
        VIDEOS_TABLE,
        [
            {
                "sheet_video_key": sheet_video_key,
                "url": url,
                "target_device_count": target_device_count,
                "status": "pending",
            }
        ],
        prefer="return=representation",
    )
    if not created_list:
        raise RuntimeError("videos row 생성 결과를 받지 못했습니다.")
    return created_list[0]


def count_assignments_for_video(video_id: str) -> int:
    rows = supabase_get(
        ASSIGNMENTS_TABLE,
        {
            "video_id": f"eq.{video_id}",
            "select": "id",
        },
    )
    return len(rows)


def run_orchestrator(video_id: str, target_count: int, batch_size: int) -> None:
    """기존 orchestrator CLI 를 서브프로세스로 호출한다."""

    cmd = [
        sys.executable,
        "scripts/local/local-orchestrate_video_assignments-cli.py",
        "--video-id",
        video_id,
        "--target-count",
        str(target_count),
        "--batch-size",
        str(batch_size),
    ]
    print("[INFO] Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Google Sheets Videos -> Supabase assignments")
    parser.add_argument("--spreadsheet-id", required=True, help="Google Sheets spreadsheet ID")
    parser.add_argument("--sheet-name", default="Videos", help="시트 이름 (기본: Videos)")
    parser.add_argument("--batch-size", type=int, default=60, help="배치 크기 (기본 60)")
    parser.add_argument("--default-target-count", type=int, default=600, help="target_device_count 비어있을 때 기본값")
    parser.add_argument("--dry-run", action="store_true", help="실제 Supabase/Sheets 수정 없이 어떤 작업을 할지 출력만")

    args = parser.parse_args()

    print("=== Sync Google Sheets Videos -> Supabase ===")

    rows = load_videos_sheet(args.spreadsheet_id, args.sheet_name)
    print(f"시트에서 {len(rows)}개 row 로드")

    for row in rows:
        row_number = row["row_number"]
        active = str(row.get("active") or "").strip().upper()
        status = str(row.get("status") or "").strip().lower()

        if active not in ("TRUE", "1", "Y", "YES"):
            continue
        if status not in ("", "new"):
            continue

        sheet_video_key = row.get("sheet_video_key")
        print(f"[ROW {row_number}] 처리 대상: sheet_video_key={sheet_video_key}")

        try:
            # Supabase videos upsert
            video = ensure_video_row(row)
            video_id = video["id"]
            target_device_count = video.get("target_device_count") or args.default_target_count

            print(f"  - Supabase video id={video_id}, target_device_count={target_device_count}")

            if args.dry_run:
                print("  - DRY RUN: orchestrator 호출/시트 업데이트 생략")
                continue

            # assignments 생성
            run_orchestrator(video_id, int(target_device_count), args.batch_size)

            # assignments 개수 조회
            assigned_count = count_assignments_for_video(video_id)
            print(f"  - 생성된 video_assignments 개수: {assigned_count}")

            # 시트 업데이트
            update_videos_row(
                args.spreadsheet_id,
                row_number,
                {
                    "supabase_video_id": video_id,
                    "status": "assigning",
                    "assigned_count": assigned_count,
                },
                sheet_name=args.sheet_name,
            )
            print("  - 시트 업데이트 완료")

        except Exception as e:
            print(f"[ERROR] row {row_number} 처리 실패: {e}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[FATAL] {e}")
        sys.exit(1)