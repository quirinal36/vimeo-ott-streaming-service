from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.services.supabase import get_supabase_admin_client
from app.services.bunny import bunny_service
from app.schemas.video import VideoResponse, SignedUrlResponse, ProgressUpdate
from app.schemas.common import StatusResponse

router = APIRouter()


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(video_id: UUID, current_user: dict = Depends(get_current_user)):
    """비디오 상세 정보 조회"""
    supabase = get_supabase_admin_client()

    # 비디오 정보 조회
    result = (
        supabase.table("videos")
        .select("*")
        .eq("id", str(video_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    video = result.data

    # 수강 권한 확인
    enrollment = (
        supabase.table("enrollments")
        .select("*")
        .eq("user_id", str(current_user.id))
        .eq("course_id", video["course_id"])
        .execute()
    )

    if not enrollment.data or len(enrollment.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 강의에 대한 수강 권한이 없습니다",
        )

    return video


@router.post("/{video_id}/signed-url", response_model=SignedUrlResponse)
async def get_signed_url(video_id: UUID, current_user: dict = Depends(get_current_user)):
    """Signed URL 발급"""
    supabase = get_supabase_admin_client()

    # 비디오 정보 조회
    result = (
        supabase.table("videos")
        .select("bunny_video_id, course_id")
        .eq("id", str(video_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    video = result.data

    # 수강 권한 확인
    enrollment = (
        supabase.table("enrollments")
        .select("*")
        .eq("user_id", str(current_user.id))
        .eq("course_id", video["course_id"])
        .execute()
    )

    if not enrollment.data or len(enrollment.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 강의에 대한 수강 권한이 없습니다",
        )

    # DRM iframe URL 생성
    iframe_url = bunny_service.generate_iframe_url(
        video_id=video["bunny_video_id"],
        expires_in_hours=2,
    )

    return {"iframe_url": iframe_url, "expires_in": 7200}


@router.post("/{video_id}/progress", response_model=StatusResponse)
async def update_progress(
    video_id: UUID,
    progress: ProgressUpdate,
    current_user: dict = Depends(get_current_user),
):
    """시청 진도 업데이트"""
    supabase = get_supabase_admin_client()

    # 비디오 존재 확인
    video = (
        supabase.table("videos")
        .select("id, course_id")
        .eq("id", str(video_id))
        .single()
        .execute()
    )

    if not video.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    # 수강 권한 확인
    enrollment = (
        supabase.table("enrollments")
        .select("*")
        .eq("user_id", str(current_user.id))
        .eq("course_id", video.data["course_id"])
        .execute()
    )

    if not enrollment.data or len(enrollment.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 강의에 대한 수강 권한이 없습니다",
        )

    # upsert로 시청 기록 업데이트
    supabase.table("watch_history").upsert(
        {
            "user_id": str(current_user.id),
            "video_id": str(video_id),
            "progress_seconds": progress.progress_seconds,
            "is_completed": progress.is_completed,
        },
        on_conflict="user_id,video_id",
    ).execute()

    return {"status": "success"}


@router.get("/{video_id}/progress")
async def get_progress(video_id: UUID, current_user: dict = Depends(get_current_user)):
    """시청 진도 조회"""
    supabase = get_supabase_admin_client()

    result = (
        supabase.table("watch_history")
        .select("*")
        .eq("user_id", str(current_user.id))
        .eq("video_id", str(video_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        return {"progress_seconds": 0, "is_completed": False}

    return {
        "progress_seconds": result.data["progress_seconds"],
        "is_completed": result.data["is_completed"],
    }
