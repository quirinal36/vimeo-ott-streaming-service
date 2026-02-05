from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.supabase import get_supabase_client

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """현재 인증된 사용자 정보 반환"""

    token = credentials.credentials
    supabase = get_supabase_client()

    try:
        # Supabase에서 토큰 검증
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
        return user_response.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_admin_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """관리자 권한 확인"""

    supabase = get_supabase_client()

    # profiles 테이블에서 role 확인
    result = (
        supabase.table("profiles")
        .select("role")
        .eq("id", str(current_user.id))
        .single()
        .execute()
    )

    if not result.data or result.data.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    return current_user
