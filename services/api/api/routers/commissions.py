"""
작업 위임(Commission) 관리 API 라우터

TODO: 구현 예정
"""

from fastapi import APIRouter

router = APIRouter(prefix="/commissions", tags=["commissions"])


@router.get("/")
async def list_commissions():
    """작업 위임 목록 조회"""
    return {"message": "Not implemented yet", "data": []}
