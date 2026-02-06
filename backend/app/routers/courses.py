from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.services.supabase import get_supabase_admin_client
from app.schemas.course import CourseResponse, CourseWithVideosResponse

router = APIRouter()


@router.get("", response_model=List[CourseResponse])
async def get_courses(current_user: dict = Depends(get_current_user)):
    """강의 목록 조회 (수강 등록된 강의만)"""
    supabase = get_supabase_admin_client()

    # 사용자가 수강 등록한 강의 ID 조회
    enrollments = (
        supabase.table("enrollments")
        .select("course_id")
        .eq("user_id", str(current_user.id))
        .execute()
    )

    if not enrollments.data:
        return []

    course_ids = [e["course_id"] for e in enrollments.data]

    # 강의 정보 조회
    courses = (
        supabase.table("courses")
        .select("*")
        .in_("id", course_ids)
        .eq("is_published", True)
        .execute()
    )

    return courses.data or []


@router.get("/all", response_model=List[CourseResponse])
async def get_all_courses(current_user: dict = Depends(get_current_user)):
    """모든 공개 강의 목록 조회"""
    supabase = get_supabase_admin_client()

    courses = (
        supabase.table("courses")
        .select("*")
        .eq("is_published", True)
        .execute()
    )

    return courses.data or []


@router.get("/{course_id}", response_model=CourseWithVideosResponse)
async def get_course(course_id: UUID, current_user: dict = Depends(get_current_user)):
    """강의 상세 조회"""
    supabase = get_supabase_admin_client()

    # 강의 정보 조회
    course = (
        supabase.table("courses")
        .select("*")
        .eq("id", str(course_id))
        .single()
        .execute()
    )

    if not course.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # 수강 권한 확인
    enrollment = (
        supabase.table("enrollments")
        .select("*")
        .eq("user_id", str(current_user.id))
        .eq("course_id", str(course_id))
        .single()
        .execute()
    )

    if not enrollment.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this course",
        )

    # 비디오 목록 조회
    videos = (
        supabase.table("videos")
        .select("id, title, duration_seconds, order_index, bunny_thumbnail")
        .eq("course_id", str(course_id))
        .order("order_index")
        .execute()
    )

    return {**course.data, "videos": videos.data or []}


@router.get("/{course_id}/videos", response_model=List[dict])
async def get_course_videos(
    course_id: UUID, current_user: dict = Depends(get_current_user)
):
    """강의 내 비디오 목록 조회"""
    supabase = get_supabase_admin_client()

    # 수강 권한 확인
    enrollment = (
        supabase.table("enrollments")
        .select("*")
        .eq("user_id", str(current_user.id))
        .eq("course_id", str(course_id))
        .single()
        .execute()
    )

    if not enrollment.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this course",
        )

    # 비디오 목록 조회
    videos = (
        supabase.table("videos")
        .select("*")
        .eq("course_id", str(course_id))
        .order("order_index")
        .execute()
    )

    # 시청 기록 조회
    video_ids = [v["id"] for v in videos.data] if videos.data else []

    watch_history = {}
    if video_ids:
        history = (
            supabase.table("watch_history")
            .select("video_id, progress_seconds, is_completed")
            .eq("user_id", str(current_user.id))
            .in_("video_id", video_ids)
            .execute()
        )

        for h in history.data or []:
            watch_history[h["video_id"]] = {
                "progress_seconds": h["progress_seconds"],
                "is_completed": h["is_completed"],
            }

    # 시청 기록 병합
    result = []
    for video in videos.data or []:
        video_with_progress = {
            **video,
            "progress_seconds": watch_history.get(video["id"], {}).get("progress_seconds", 0),
            "is_completed": watch_history.get(video["id"], {}).get("is_completed", False),
        }
        result.append(video_with_progress)

    return result
