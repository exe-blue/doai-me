"""
유지보수(Maintenance) API 라우터

TODO: 구현 예정
"""

from fastapi import APIRouter

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/")
async def get_maintenance_status():
    """유지보수 상태 조회"""
    return {"message": "Not implemented yet", "status": "healthy"}
