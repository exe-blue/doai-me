#!/usr/bin/env python3
"""
Video Assignment Orchestrator

역할:
- Supabase videos / devices 테이블을 읽어서,
- 특정 video_id (또는 status=pending 인 가장 최근 영상)에 대해
  최대 N대(기본 600대) 디바이스에 video_assignments를 생성한다.
- 60대 단위로 batch_no(0~9)를 부여한다.

전제:
- Supabase에 아래 테이블이 존재한다고 가정
  - videos(id uuid, status, target_device_count 등)
  - devices(id uuid, device_code, is_active 등)
  - video_assignments(id uuid, video_id, device_id, batch_no, status 등)

환경변수:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

사용 예:
  export SUPABASE_URL="https://<your-project>.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
  python orchestrate_video_assignments.py --video-id <uuid>

또는, video-id 를 생략하면 status='pending' 인 videos 중 가장 오래된 것 1개 선택.
"""

import os
import sys
import argparse
from typing import List, Dict, Optional

import requests


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.")

REST_URL = f"{SUPABASE_URL}/rest/v1"

VIDEOS_TABLE = "videos"
DEVICES_TABLE = "devices"
ASSIGNMENTS_TABLE = "video_assignments"


def supabase_get(path: str, params: Optional[Dict] = None) -> List[Dict]:
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


def supabase_post(path: str, rows: List[Dict], prefer: str = "return=minimal") -> None:
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


def supabase_patch(path: str, match: Dict, update: Dict) -> None:
    """단순 PATCH 헬퍼 (WHERE 조건은 eq= 로만 간단 처리)."""
    url = f"{REST_URL}/{path}"
    params = {f"{k}.eq": v for k, v in match.items()}
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    resp = requests.patch(url, headers=headers, params=params, json=update)
    if not resp.ok:
        raise RuntimeError(f"Supabase PATCH 실패: {resp.status_code} {resp.text}")


def pick_video(video_id: Optional[str]) -> Dict:
    """명시된 video_id가 있으면 그 영상, 없으면 status='pending' 중 가장 오래된 1개 선택."""
    if video_id:
        rows = supabase_get(f"{VIDEOS_TABLE}", {"id": f"eq.{video_id}"})
        if not rows:
            raise RuntimeError(f"지정한 video_id 를 찾을 수 없습니다: {video_id}")
        return rows[0]

    # pending 중 오래된 것 1개
    rows = supabase_get(
        f"{VIDEOS_TABLE}",
        {
            "status": "eq.pending",
            "order": "created_at.asc",
            "limit": "1",
        },
    )
    if not rows:
        raise RuntimeError("status='pending' 인 영상이 없습니다.")
    return rows[0]


def load_available_devices(limit: int) -> List[Dict]:
    """할당 가능한 active device 리스트를 최대 limit 개 가져오기."""
    # is_active=true 인 디바이스를 device_code 순으로 정렬해서 가져온다.
    rows = supabase_get(
        f"{DEVICES_TABLE}",
        {
            "is_active": "eq.true",
            "order": "device_code.asc",
            "limit": str(limit),
        },
    )
    if not rows:
        raise RuntimeError("활성화된 devices 가 없습니다.")
    return rows


def generate_assignments(video: Dict, devices: List[Dict], batch_size: int) -> List[Dict]:
    """devices 리스트에 대해 video_assignments rows 생성."""
    video_id = video["id"]
    assignments: List[Dict] = []

    for idx, dev in enumerate(devices):
        batch_no = idx // batch_size
        assignments.append(
            {
                "video_id": video_id,
                "device_id": dev["id"],
                "batch_no": batch_no,
                "status": "pending",
            }
        )

    return assignments


def main() -> None:
    parser = argparse.ArgumentParser(description="Supabase video_assignments Orchestrator")
    parser.add_argument("--video-id", help="대상 video UUID (생략 시 pending 중 가장 오래된 것)")
    parser.add_argument("--target-count", type=int, default=600, help="할당할 디바이스 수 (기본 600)")
    parser.add_argument("--batch-size", type=int, default=60, help="배치 크기 (기본 60, 즉 10배치)")

    args = parser.parse_args()

    print("=== Video Assignment Orchestrator ===")

    video = pick_video(args.video_id)
    print(f"선택된 영상: id={video['id']}, url={video.get('url')}, status={video.get('status')}")

    target_count = args.target_count
    batch_size = args.batch_size

    devices = load_available_devices(target_count)
    print(f"활성 디바이스 {len(devices)}대 로딩 (요청={target_count})")

    assignments = generate_assignments(video, devices, batch_size)
    print(f"생성될 video_assignments 개수: {len(assignments)}")

    if not assignments:
        print("생성할 할당이 없습니다. 종료.")
        return

    # bulk insert
    supabase_post(ASSIGNMENTS_TABLE, assignments, prefer="return=minimal")
    print("video_assignments bulk insert 완료.")

    # videos.status 를 assigning 혹은 watching 으로 업데이트 (여기서는 assigning 으로 표기)
    supabase_patch(VIDEOS_TABLE, {"id": video["id"]}, {"status": "assigning"})
    print(f"영상 status 를 'assigning' 으로 업데이트: {video['id']}")

    print("완료.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)