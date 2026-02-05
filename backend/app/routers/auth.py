from fastapi import APIRouter, HTTPException, status, Depends

from app.services.supabase import get_supabase_client, get_supabase_admin_client
from app.dependencies import get_current_user
from app.schemas.user import UserCreate, UserLogin, ProfileResponse
from app.schemas.common import MessageResponse

router = APIRouter()


@router.post("/signup", response_model=MessageResponse)
async def signup(user_data: UserCreate):
    """회원가입"""
    supabase = get_supabase_client()

    try:
        # Supabase Auth로 사용자 생성
        # user_metadata에 name을 저장하면 트리거가 자동으로 profiles에 삽입
        response = supabase.auth.sign_up(
            {
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "name": user_data.name,
                    }
                },
            }
        )

        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user",
            )

        # profiles 테이블은 on_auth_user_created 트리거가 자동으로 생성
        return {"message": "User created successfully. Please check your email to verify your account."}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/signin")
async def signin(user_data: UserLogin):
    """로그인"""
    supabase = get_supabase_client()

    try:
        response = supabase.auth.sign_in_with_password(
            {"email": user_data.email, "password": user_data.password}
        )

        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer",
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.post("/signout", response_model=MessageResponse)
async def signout(current_user: dict = Depends(get_current_user)):
    """로그아웃"""
    supabase = get_supabase_client()

    try:
        supabase.auth.sign_out()
        return {"message": "Successfully signed out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/me", response_model=ProfileResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """현재 사용자 정보 조회"""
    # 서버사이드에서 admin 클라이언트 사용 (RLS 우회)
    supabase = get_supabase_admin_client()

    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", str(current_user.id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return result.data
