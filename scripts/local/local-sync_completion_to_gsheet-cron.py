#!/usr/bin/env python3
"""
Sync Supabase videos completion status -> Google Sheets Videos 시트.

역할:
- Supabase videos / video_assignments 테이블에서 각 영상의
  assigned / completed 개수를 집계하고,
- 구글 시트의 해당 row (sheet_video_key 기준)에
  status, assigned_count, completed_count, completion_rate 를 반영한다.

환경변수:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  GOOGLE_SERVICE_ACCOUNT_FILE

사용 예:
  python scripts/local/local-sync_completion_to_gsheet-cron.py \
    --spreadsheet-id <SPREADSHEET_ID> \
    --sheet-name Videos

이 스크립트는 cron, scheduler 등에서 주기적으로 실행하는 것을 가정한다.
"""

import os
import sys
import argparse
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


def fetch_videos_with_sheet_key() -> List[Dict[str, Any]]:
    """sheet_video_key 가 설정된 videos 를 모두 가져온다."""

    params = {
        "select": "id,sheet_video_key,status,target_device_count,assigned_device_count,completed_device_count",
        "sheet_video_key": "not.is.null",
    }
    return supabase_get(VIDEOS_TABLE, params)


def count_assignments(video_id: str) -> Dict[str, int]:
    """video_assignments 테이블에서 assigned/completed 개수를 계산한다.

    - status in ('pending','assigned','watching','completed','failed') 라고 가정.
    """

    rows = supabase_get(
        ASSIGNMENTS_TABLE,
        {
            "video_id": f"eq.{video_id}",
            "select": "id,status",
        },
    )
    assigned = len(rows)
    completed = sum(1 for r in rows if str(r.get("status", "")).lower() == "completed")
    return {"assigned": assigned, "completed": completed}


def build_sheet_row_index(spreadsheet_id: str, sheet_name: str) -> Dict[str, int]:
    """sheet_video_key -> row_number 매핑을 만든다."""

    rows = load_videos_sheet(spreadsheet_id, sheet_name)
    index: Dict[str, int] = {}
    for row in rows:
        key = str(row.get("sheet_video_key") or "").strip()
        if not key:
            continue
        index[key] = int(row["row_number"])
    return index


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Supabase completion -> Google Sheets")
    parser.add_argument("--spreadsheet-id", required=True, help="Google Sheets spreadsheet ID")
    parser.add_argument("--sheet-name", default="Videos", help="시트 이름 (기본: Videos)")
    parser.add_argument("--recalc-from-assignments", action="store_true", help="videos 테이블 컬럼 대신 video_assignments 를 직접 카운트")

    args = parser.parse_args()

    print("=== Sync Supabase completion -> Google Sheets ===")

    sheet_index = build_sheet_row_index(args.spreadsheet_id, args.sheet_name)
    print(f"시트 인덱스 로드: {len(sheet_index)}개 key")

    videos = fetch_videos_with_sheet_key()
    print(f"Supabase videos 로드: {len(videos)}개")

    for video in videos:
        sheet_key = str(video.get("sheet_video_key") or "").strip()
        if not sheet_key:
            continue
        row_number = sheet_index.get(sheet_key)
        if not row_number:
            print(f"[WARN] sheet_video_key={sheet_key} 에 해당하는 시트 row 를 찾지 못했습니다.")
            continue

        video_id = video["id"]

        if args.recalc_from_assignments:
            counts = count_assignments(video_id)
            assigned = counts["assigned"]
            completed = counts["completed"]
        else:
            # videos 테이블에 집계 컬럼이 있다고 가정하고 사용
            assigned = int(video.get("assigned_device_count") or 0)
            completed = int(video.get("completed_device_count") or 0)

        completion_rate = 0.0
        if assigned > 0:
            completion_rate = completed / float(assigned)

        status = str(video.get("status") or "").strip() or "watching"

        print(
            f"[VIDEO] sheet_key={sheet_key}, id={video_id}, "
            f"assigned={assigned}, completed={completed}, rate={completion_rate:.2%}"
        )

        update_videos_row(
            args.spreadsheet_id,
            row_number,
            {
                "status": status,
                "assigned_count": assigned,
                "completed_count": completed,
                "completion_rate": completion_rate,
            },
            sheet_name=args.sheet_name,
        )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[FATAL] {e}")
        sys.exit(1)
