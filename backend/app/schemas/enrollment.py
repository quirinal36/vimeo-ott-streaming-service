from typing import Optional
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class EnrollmentCreate(BaseModel):
    user_id: UUID
    course_id: UUID
    expires_at: Optional[datetime] = None


class EnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    enrolled_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True
