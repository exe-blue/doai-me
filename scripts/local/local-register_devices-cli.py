#!/usr/bin/env python3
"""
Supabase devices upsert script

- adb devices 로 연결된 기기 목록 조회
- board_number / slot_number / device_code / serial / pc_id 생성
- Supabase devices 테이블에 upsert

주의:
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수 필요
- BOARD_NUMBER 환경변수로 이 PC의 폰보드 번호 지정 (기본 1)

사용 예:
  export SUPABASE_URL="https://<your-project>.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
  export BOARD_NUMBER="1"
  python register_devices.py
"""

import os
import subprocess
import socket
from typing import List, Dict

import requests


# ========= 설정 =========

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.")

SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"

# 테이블 이름
DEVICES_TABLE = "devices"

# ADB 경로 (PATH에 있으면 그냥 'adb')
ADB_BIN = os.getenv("ADB_BIN", "adb")

# 이 PC의 board_number 지정 방법
#  - 간단히: 환경변수 BOARD_NUMBER 로 지정, 없으면 1 사용
BOARD_NUMBER = int(os.getenv("BOARD_NUMBER", "1"))


# ========= 헬퍼 =========

def get_pc_id() -> str:
    """PC ID = hostname"""
    return socket.gethostname()


def parse_adb_devices() -> List[str]:
    """adb devices 출력에서 시리얼 리스트 반환"""
    try:
        result = subprocess.run(
            [ADB_BIN, "devices"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception as e:
        raise RuntimeError(f"adb 실행 실패: {e}")

    lines = result.stdout.strip().splitlines()
    # 첫 줄은 "List of devices attached"
    serials: List[str] = []
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        if "\tdevice" in line:
            serial = line.split("\t")[0]
            serials.append(serial)

    return serials


def assign_slots_to_serials(serials: List[str]) -> List[Dict]:
    """
    시리얼 리스트에 slot_number 를 1..N 으로 붙이고,
    device_code, board_number, pc_id까지 포함한 dict 리스트 반환

    - 슬롯은 단순히 1부터 차례대로 할당 (최대 20까지)
    - 필요하면 여기서 슬롯/보드 매핑 로직을 바꾸면 됨
    """
    pc_id = get_pc_id()
    devices: List[Dict] = []

    for idx, serial in enumerate(serials):
        slot_number = idx + 1  # 1-based
        if slot_number > 20:
            # 현재 설계상 슬롯 20개까지만 사용
            print(f"[WARN] 슬롯 20개 초과: serial={serial} (무시)")
            continue

        # device_code = "보드-슬롯" (2자리 zero padding)
        board_str = f"{BOARD_NUMBER:02d}"
        slot_str = f"{slot_number:02d}"
        device_code = f"{board_str}-{slot_str}"

        devices.append(
            {
                "board_number": BOARD_NUMBER,
                "slot_number": slot_number,
                "device_code": device_code,
                "serial": serial,
                "pc_id": pc_id,
            }
        )

    return devices


def upsert_devices_to_supabase(devices: List[Dict]) -> None:
    """Supabase REST를 사용하여 devices upsert"""

    if not devices:
        print("등록할 디바이스가 없습니다.")
        return

    url = f"{SUPABASE_REST_URL}/{DEVICES_TABLE}"

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        # upsert 허용 + 고유키 기준 병합
        # devices 테이블의 unique index 를 (board_number, slot_number) 로 맞춰둔 상태라 가정
        "Prefer": "resolution=merge-duplicates",
    }

    resp = requests.post(url, headers=headers, json=devices)
    if not resp.ok:
        raise RuntimeError(
            f"Supabase upsert 실패: status={resp.status_code}, body={resp.text}"
        )

    print(f"Supabase upsert 성공: {len(devices)}개 디바이스")


def main() -> None:
    print("=== Supabase devices 자동 등록 ===")

    serials = parse_adb_devices()
    print(f"adb devices 감지: {len(serials)}대")

    devices = assign_slots_to_serials(serials)

    for d in devices:
        print(
            f"- board={d['board_number']}, slot={d['slot_number']}, "
            f"code={d['device_code']}, serial={d['serial']}, pc_id={d['pc_id']}"
        )

    if not devices:
        print("등록할 디바이스 없음. 종료.")
        return

    upsert_devices_to_supabase(devices)
    print("완료.")


if __name__ == "__main__":
    main()
