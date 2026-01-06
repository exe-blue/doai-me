"""
DoAi.Me Backend API
역할: 복잡한 계산 (타락도, 의사결정)
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DoAi.Me API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
async def health():
    """헬스 체크"""
    return {"status": "ok", "service": "doai-api"}

@app.get("/")
async def root():
    """API 루트"""
    return {
        "service": "DoAi.Me Backend API",
        "version": "1.0.0",
        "endpoints": {
            "/health": "헬스 체크",
            "/api/corruption/calculate": "타락도 계산",
            "/api/maintenance/calculate": "유지비 계산"
        }
    }

# ==================== 타락도 계산 ====================

@app.post("/api/corruption/calculate")
async def calculate_corruption(data: dict):
    """
    페르소나 타락도 계산

    타락도 증가 요인:
    - 광고 시청 (커미션 발생 시)
    - 비정상적 시청 패턴

    타락도 감소 요인:
    - 자연스러운 시청 (시간 경과)
    """
    persona_id = data.get("persona_id")
    current_corruption = data.get("current_corruption", 0)
    commission_earned = data.get("commission_earned", 0)

    # 커미션당 타락도 증가
    max_per_commission = float(os.getenv("MAX_CORRUPTION_PER_COMMISSION", 0.05))
    corruption_increase = min(commission_earned * 0.01, max_per_commission)

    # 시간 경과에 따른 자연 감소
    decay_rate = float(os.getenv("CORRUPTION_DECAY_RATE", 0.001))

    new_corruption = current_corruption + corruption_increase - decay_rate
    new_corruption = max(0, min(1, new_corruption))  # 0~1 범위

    return {
        "persona_id": persona_id,
        "previous_corruption": current_corruption,
        "new_corruption": new_corruption,
        "change": new_corruption - current_corruption
    }

# ==================== 유지비 계산 ====================

@app.post("/api/maintenance/calculate")
async def calculate_maintenance(data: dict):
    """
    디바이스 유지비 계산

    기본 공식: base_cost * (1 + corruption_level)
    """
    device_id = data.get("device_id")
    corruption_level = data.get("corruption_level", 0)

    base_cost = float(os.getenv("MAINTENANCE_BASE_COST", 10.0))
    min_cost = float(os.getenv("MAINTENANCE_MIN_COST", 5.0))
    max_cost = float(os.getenv("MAINTENANCE_MAX_COST", 50.0))

    # 타락도가 높을수록 유지비 증가
    calculated_cost = base_cost * (1 + corruption_level)
    final_cost = max(min_cost, min(max_cost, calculated_cost))

    return {
        "device_id": device_id,
        "corruption_level": corruption_level,
        "base_cost": base_cost,
        "final_cost": final_cost
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
