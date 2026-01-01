#!/usr/bin/env python3
"""
Google Sheets helper library for DOAI scripts.

- Service account 기반으로 Google Sheets API v4를 사용한다.
- Videos 시트를 읽고/쓰기 위한 최소 헬퍼만 제공한다.

환경변수:
  GOOGLE_SERVICE_ACCOUNT_FILE: 서비스 계정 JSON 파일 경로

의존성:
  google-api-python-client
  google-auth

설치 예시:
  pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
"""

import os
from typing import Dict, List, Any

from google.oauth2 import service_account
from googleapiclient.discovery import build


SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Videos 시트 컬럼 정의 (A~J)
VIDEO_COLUMNS = [
    "sheet_video_key",  # A
    "url",              # B
    "target_device_count",  # C
    "active",           # D (TRUE/FALSE)
    "supabase_video_id",    # E
    "status",           # F
    "assigned_count",   # G
    "completed_count",  # H
    "completion_rate",  # I
    "note",             # J
]


def _get_sheets_service():
    cred_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
    if not cred_file:
        raise RuntimeError("환경변수 GOOGLE_SERVICE_ACCOUNT_FILE 를 설정하세요 (서비스 계정 JSON 경로).")

    credentials = service_account.Credentials.from_service_account_file(
        cred_file, scopes=SCOPES
    )
    service = build("sheets", "v4", credentials=credentials)
    return service


def load_videos_sheet(spreadsheet_id: str, sheet_name: str = "Videos") -> List[Dict[str, Any]]:
    """Videos 시트의 모든 row 를 읽어서 dict 리스트로 반환.

    각 row dict 구조:
      {
        "row_number": 2,  # 시트 상 row 번호 (1-based)
        "sheet_video_key": "v001",
        "url": "https://...",
        ...
      }
    """

    service = _get_sheets_service()
    range_name = f"{sheet_name}!A2:J"  # 헤더는 1행, 데이터는 2행부터

    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=range_name)
        .execute()
    )
    values = result.get("values", [])

    rows: List[Dict[str, Any]] = []
    for idx, row in enumerate(values, start=2):  # row 2부터 시작
        row_dict: Dict[str, Any] = {"row_number": idx}
        for col_idx, col_name in enumerate(VIDEO_COLUMNS):
            row_dict[col_name] = row[col_idx] if col_idx < len(row) else ""
        rows.append(row_dict)

    return rows


def update_videos_row(
    spreadsheet_id: str,
    row_number: int,
    updates: Dict[str, Any],
    sheet_name: str = "Videos",
) -> None:
    """단일 row의 일부 컬럼을 업데이트한다.

    updates: {column_name: value}
    """

    service = _get_sheets_service()

    # 먼저 기존 row 전체를 읽어와서 필요한 컬럼만 교체한다.
    range_name = f"{sheet_name}!A{row_number}:J{row_number}"
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=range_name)
        .execute()
    )
    values = result.get("values", [[]])
    row = values[0] if values else []

    # 길이를 10컬럼(A~J)까지 맞춘다.
    if len(row) < len(VIDEO_COLUMNS):
        row = row + [""] * (len(VIDEO_COLUMNS) - len(row))

    # 업데이트 적용
    for col_name, new_value in updates.items():
        if col_name not in VIDEO_COLUMNS:
            continue
        idx = VIDEO_COLUMNS.index(col_name)
        row[idx] = str(new_value) if new_value is not None else ""

    body = {"values": [row]}
    (
        service.spreadsheets()
        .values()
        .update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            body=body,
        )
        .execute()
    )
