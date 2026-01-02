"""
Authentication & Authorization
Bearer Token 인증 시스템

Orion's Directive:
\"공유 토큰은 위험하므로 Admin/NODE 토큰 분리한다.\"

역할:
- Bearer 토큰 파싱 및 검증
- Admin/Node 권한 분리
- FastAPI Depends() 의존성 제공

@author Axon (Builder)
@version 1.0.0
"""

import os
from typing import Optional
from fastapi import HTTPException, Header, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ==================== 설정 ====================

# 환경 변수에서 토큰 로드
ADMIN_TOKEN = os.getenv('ADMIN_TOKEN', 'admin-secret-token-change-me')
NODE_TOKEN = os.getenv('NODE_TOKEN', 'node-secret-token-change-me')

# Bearer 스키마
security = HTTPBearer()


# ==================== 토큰 검증 ====================

def verify_token(token: str, expected_role: str) -> bool:
    """
    토큰 검증
    
    Args:
        token: Bearer 토큰
        expected_role: 'admin' 또는 'node'
    
    Returns:
        검증 성공 여부
    """
    if expected_role == 'admin':
        return token == ADMIN_TOKEN
    elif expected_role == 'node':
        return token == NODE_TOKEN
    else:
        return False


# ==================== FastAPI Dependencies ====================

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Admin 권한 필요
    
    사용:
        @router.get("/admin/endpoint")
        async def admin_only(token: str = Depends(require_admin)):
            ...
    """
    token = credentials.credentials
    
    if not verify_token(token, 'admin'):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid admin token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return token


async def require_node(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Node 권한 필요
    
    사용:
        @router.get("/node/endpoint")
        async def node_only(token: str = Depends(require_node)):
            ...
    """
    token = credentials.credentials
    
    if not verify_token(token, 'node'):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid node token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return token


async def require_any_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Admin 또는 Node 권한 필요
    
    Returns:
        {'role': 'admin'|'node', 'token': str}
    """
    token = credentials.credentials
    
    if verify_token(token, 'admin'):
        return {'role': 'admin', 'token': token}
    elif verify_token(token, 'node'):
        return {'role': 'node', 'token': token}
    else:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ==================== Optional Auth (무인증 허용) ====================

async def optional_auth(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """
    선택적 인증
    
    토큰이 있으면 검증, 없으면 None 반환
    """
    if not authorization:
        return None
    
    if not authorization.startswith('Bearer '):
        return None
    
    token = authorization[7:]  # "Bearer " 제거
    
    if verify_token(token, 'admin'):
        return {'role': 'admin', 'token': token}
    elif verify_token(token, 'node'):
        return {'role': 'node', 'token': token}
    else:
        return None


# ==================== 토큰 생성 (유틸리티) ====================

def generate_secure_token(length: int = 32) -> str:
    """
    안전한 랜덤 토큰 생성
    
    사용:
        python -c "from auth import generate_secure_token; print(generate_secure_token())"
    """
    import secrets
    return secrets.token_urlsafe(length)


if __name__ == "__main__":
    # 토큰 생성 유틸리티
    print("╔════════════════════════════════════════════════════════╗")
    print("║  DoAi.Me 토큰 생성기                                  ║")
    print("╚════════════════════════════════════════════════════════╝")
    print()
    print("Admin Token:")
    print(generate_secure_token(32))
    print()
    print("Node Token:")
    print(generate_secure_token(32))
    print()
    print(".env 파일에 추가하세요:")
    print("  ADMIN_TOKEN=<위 Admin Token>")
    print("  NODE_TOKEN=<위 Node Token>")
