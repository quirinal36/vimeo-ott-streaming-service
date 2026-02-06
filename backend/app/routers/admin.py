from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_admin_user
from app.services.supabase import get_supabase_admin_client
from app.services.bunny import bunny_service
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.video import VideoCreate, VideoUpdate, VideoResponse
from app.schemas.enrollment import EnrollmentCreate, EnrollmentResponse
from app.schemas.common import MessageResponse

router = APIRouter()


# ============== Course Management ==============


@router.get("/courses", response_model=List[CourseResponse])
async def admin_get_courses(current_user: dict = Depends(get_current_admin_user)):
    """모든 강의 목록 조회 (관리자)"""
    supabase = get_supabase_admin_client()

    courses = supabase.table("courses").select("*").execute()
    return courses.data or []


@router.post("/courses", response_model=CourseResponse)
async def admin_create_course(
    course_data: CourseCreate,
    current_user: dict = Depends(get_current_admin_user),
):
    """강의 생성 (관리자)"""
    supabase = get_supabase_admin_client()

    result = supabase.table("courses").insert(course_data.model_dump()).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create course",
        )

    return result.data[0]


@router.put("/courses/{course_id}", response_model=CourseResponse)
async def admin_update_course(
    course_id: UUID,
    course_data: CourseUpdate,
    current_user: dict = Depends(get_current_admin_user),
):
    """강의 수정 (관리자)"""
    supabase = get_supabase_admin_client()

    # 기존 강의 확인
    existing = (
        supabase.table("courses").select("*").eq("id", str(course_id)).single().execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # 업데이트
    update_data = {k: v for k, v in course_data.model_dump().items() if v is not None}

    result = (
        supabase.table("courses")
        .update(update_data)
        .eq("id", str(course_id))
        .execute()
    )

    return result.data[0]


@router.delete("/courses/{course_id}", response_model=MessageResponse)
async def admin_delete_course(
    course_id: UUID,
    current_user: dict = Depends(get_current_admin_user),
):
    """강의 삭제 (관리자)"""
    supabase = get_supabase_admin_client()

    # 강의에 속한 비디오 삭제
    supabase.table("videos").delete().eq("course_id", str(course_id)).execute()

    # 수강 등록 삭제
    supabase.table("enrollments").delete().eq("course_id", str(course_id)).execute()

    # 강의 삭제
    supabase.table("courses").delete().eq("id", str(course_id)).execute()

    return {"message": "Course deleted successfully"}


# ============== Video Management ==============


@router.get("/videos", response_model=List[VideoResponse])
async def admin_get_videos(current_user: dict = Depends(get_current_admin_user)):
    """모든 비디오 목록 조회 (관리자)"""
    supabase = get_supabase_admin_client()

    videos = supabase.table("videos").select("*").execute()
    return videos.data or []


@router.post("/videos", response_model=VideoResponse)
async def admin_create_video(
    video_data: VideoCreate,
    current_user: dict = Depends(get_current_admin_user),
):
    """비디오 등록 (관리자)"""
    supabase = get_supabase_admin_client()

    # 강의 존재 확인
    course = (
        supabase.table("courses")
        .select("id")
        .eq("id", str(video_data.course_id))
        .single()
        .execute()
    )

    if not course.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    data = video_data.model_dump()
    data["course_id"] = str(data["course_id"])

    result = supabase.table("videos").insert(data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create video",
        )

    return result.data[0]


@router.put("/videos/{video_id}", response_model=VideoResponse)
async def admin_update_video(
    video_id: UUID,
    video_data: VideoUpdate,
    current_user: dict = Depends(get_current_admin_user),
):
    """비디오 수정 (관리자)"""
    supabase = get_supabase_admin_client()

    # 기존 비디오 확인
    existing = (
        supabase.table("videos").select("*").eq("id", str(video_id)).single().execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    # 업데이트
    update_data = {k: v for k, v in video_data.model_dump().items() if v is not None}

    result = (
        supabase.table("videos").update(update_data).eq("id", str(video_id)).execute()
    )

    return result.data[0]


@router.delete("/videos/{video_id}", response_model=MessageResponse)
async def admin_delete_video(
    video_id: UUID,
    current_user: dict = Depends(get_current_admin_user),
):
    """비디오 삭제 (관리자)"""
    supabase = get_supabase_admin_client()

    # 비디오 정보 조회 (Bunny 삭제용)
    video = (
        supabase.table("videos")
        .select("bunny_video_id")
        .eq("id", str(video_id))
        .single()
        .execute()
    )

    # Bunny에서 비디오 삭제
    if video.data and video.data.get("bunny_video_id"):
        try:
            await bunny_service.delete_video(video.data["bunny_video_id"])
        except Exception:
            pass  # Bunny 삭제 실패해도 DB는 삭제

    # 시청 기록 삭제
    supabase.table("watch_history").delete().eq("video_id", str(video_id)).execute()

    # 비디오 삭제
    supabase.table("videos").delete().eq("id", str(video_id)).execute()

    return {"message": "Video deleted successfully"}


# ============== Video Upload ==============


@router.post("/videos/upload-url")
async def admin_get_upload_url(
    course_id: UUID,
    title: str,
    max_duration_seconds: int = 3600,
    current_user: dict = Depends(get_current_admin_user),
):
    """Bunny Stream Upload URL 발급 (관리자)"""
    supabase = get_supabase_admin_client()

    # 강의 존재 확인
    course = (
        supabase.table("courses")
        .select("id")
        .eq("id", str(course_id))
        .single()
        .execute()
    )

    if not course.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # Bunny Stream 비디오 생성 및 업로드 URL 발급
    result = await bunny_service.create_video(title=title)
    video_guid = result["guid"]
    upload_url = bunny_service.get_upload_url(video_guid)

    return {
        "upload_url": upload_url,
        "bunny_video_id": video_guid,
        "course_id": str(course_id),
        "title": title,
        "upload_headers": {"AccessKey": bunny_service.api_key},
    }


@router.post("/videos/complete-upload")
async def admin_complete_upload(
    bunny_video_id: str,
    course_id: UUID,
    title: str,
    description: str = None,
    duration_seconds: int = 0,
    order_index: int = 0,
    current_user: dict = Depends(get_current_admin_user),
):
    """업로드 완료 후 비디오 정보 저장 (관리자)"""
    supabase = get_supabase_admin_client()

    # Bunny에서 비디오 정보 조회
    try:
        bunny_video = await bunny_service.get_video_details(bunny_video_id)
        duration_seconds = int(bunny_video.get("length", duration_seconds))
        thumbnail = bunny_service.get_thumbnail_url(bunny_video_id)
    except Exception:
        thumbnail = bunny_service.get_thumbnail_url(bunny_video_id)

    # 데이터베이스에 비디오 정보 저장
    video_data = {
        "course_id": str(course_id),
        "title": title,
        "description": description,
        "bunny_video_id": bunny_video_id,
        "duration_seconds": duration_seconds,
        "order_index": order_index,
        "bunny_thumbnail": thumbnail,
    }

    result = supabase.table("videos").insert(video_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to save video info",
        )

    return result.data[0]


@router.get("/videos/{video_id}/status")
async def admin_get_video_status(
    video_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    """Bunny 비디오 처리 상태 조회 (관리자)"""
    try:
        video_details = await bunny_service.get_video_details(video_id)
        bunny_status = video_details.get("status", 0)
        status_map = {0: "created", 1: "uploaded", 2: "processing", 3: "transcoding", 4: "finished", 5: "error"}
        return {
            "video_id": video_id,
            "status": status_map.get(bunny_status, "unknown"),
            "ready_to_stream": bunny_status == 4,
            "duration": video_details.get("length"),
            "thumbnail": bunny_service.get_thumbnail_url(video_id),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video not found: {str(e)}",
        )


@router.get("/bunny/videos")
async def admin_list_bunny_videos(
    current_user: dict = Depends(get_current_admin_user),
):
    """Bunny Stream 비디오 목록 조회 (관리자)"""
    try:
        videos = await bunny_service.list_videos()
        return {"videos": videos}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch videos: {str(e)}",
        )


# ============== Enrollment Management ==============


@router.get("/enrollments", response_model=List[EnrollmentResponse])
async def admin_get_enrollments(current_user: dict = Depends(get_current_admin_user)):
    """모든 수강 등록 목록 조회 (관리자)"""
    supabase = get_supabase_admin_client()

    enrollments = supabase.table("enrollments").select("*").execute()
    return enrollments.data or []


@router.post("/enrollments", response_model=EnrollmentResponse)
async def admin_create_enrollment(
    enrollment_data: EnrollmentCreate,
    current_user: dict = Depends(get_current_admin_user),
):
    """수강 등록 (관리자)"""
    supabase = get_supabase_admin_client()

    # 사용자 존재 확인
    user = (
        supabase.table("profiles")
        .select("id")
        .eq("id", str(enrollment_data.user_id))
        .single()
        .execute()
    )

    if not user.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # 강의 존재 확인
    course = (
        supabase.table("courses")
        .select("id")
        .eq("id", str(enrollment_data.course_id))
        .single()
        .execute()
    )

    if not course.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # 중복 등록 확인
    existing = (
        supabase.table("enrollments")
        .select("*")
        .eq("user_id", str(enrollment_data.user_id))
        .eq("course_id", str(enrollment_data.course_id))
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already enrolled in this course",
        )

    data = enrollment_data.model_dump()
    data["user_id"] = str(data["user_id"])
    data["course_id"] = str(data["course_id"])
    if data["expires_at"]:
        data["expires_at"] = data["expires_at"].isoformat()

    result = supabase.table("enrollments").insert(data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create enrollment",
        )

    return result.data[0]


@router.delete("/enrollments/{enrollment_id}", response_model=MessageResponse)
async def admin_delete_enrollment(
    enrollment_id: UUID,
    current_user: dict = Depends(get_current_admin_user),
):
    """수강 등록 삭제 (관리자)"""
    supabase = get_supabase_admin_client()

    supabase.table("enrollments").delete().eq("id", str(enrollment_id)).execute()

    return {"message": "Enrollment deleted successfully"}


# ============== User Management ==============


@router.get("/users")
async def admin_get_users(current_user: dict = Depends(get_current_admin_user)):
    """모든 사용자 목록 조회 (관리자)"""
    supabase = get_supabase_admin_client()

    users = supabase.table("profiles").select("*").execute()
    return users.data or []


@router.put("/users/{user_id}/role")
async def admin_update_user_role(
    user_id: UUID,
    role: str,
    current_user: dict = Depends(get_current_admin_user),
):
    """사용자 역할 변경 (관리자)"""
    supabase = get_supabase_admin_client()

    if role not in ["student", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'student' or 'admin'",
        )

    result = (
        supabase.table("profiles")
        .update({"role": role})
        .eq("id", str(user_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return result.data[0]
