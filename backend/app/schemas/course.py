from typing import Optional, List
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None


class CourseCreate(CourseBase):
    is_published: bool = False


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_published: Optional[bool] = None


class CourseResponse(CourseBase):
    id: UUID
    is_published: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CourseWithVideosResponse(CourseResponse):
    videos: List["VideoSummary"] = []


class VideoSummary(BaseModel):
    id: UUID
    title: str
    duration_seconds: Optional[int] = None
    order_index: Optional[int] = None
    bunny_thumbnail: Optional[str] = None

    class Config:
        from_attributes = True


# Forward reference 해결
CourseWithVideosResponse.model_rebuild()
