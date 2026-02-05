from typing import Optional
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    cloudflare_video_id: str
    duration_seconds: Optional[int] = None
    order_index: Optional[int] = None


class VideoCreate(VideoBase):
    course_id: UUID
    cloudflare_thumbnail: Optional[str] = None
    require_signed_url: bool = True


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_seconds: Optional[int] = None
    order_index: Optional[int] = None
    cloudflare_thumbnail: Optional[str] = None
    require_signed_url: Optional[bool] = None


class VideoResponse(VideoBase):
    id: UUID
    course_id: UUID
    cloudflare_thumbnail: Optional[str] = None
    require_signed_url: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SignedUrlResponse(BaseModel):
    signed_url: str
    iframe_url: str
    expires_in: int  # seconds


class ProgressUpdate(BaseModel):
    progress_seconds: int
    is_completed: bool = False


class WatchHistoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    video_id: UUID
    progress_seconds: int
    is_completed: bool
    last_watched_at: datetime

    class Config:
        from_attributes = True
