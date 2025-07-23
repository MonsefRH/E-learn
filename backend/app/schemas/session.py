from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from datetime import date
from typing import Optional, List
from enum import Enum

class SessionStatus(str, Enum):
    PENDING = "PENDING"
    VALIDATED = "VALIDATED"
    AVAILABLE = "AVAILABLE"

class SessionBase(BaseModel):
    course_id: int = Field(..., description="Course ID")
    teacher_id: int = Field(..., description="Teacher ID")
    group_ids: List[int] = Field(..., description="List of Group IDs")
    start_date: date = Field(..., description="Start date of the session")
    status: SessionStatus = Field(default=SessionStatus.PENDING, description="Session status")

    @field_validator('course_id', 'teacher_id', mode='before')
    @classmethod
    def convert_to_int(cls, v):
        if v is None:
            raise ValueError("ID fields cannot be None")
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid integer value: {v}")

    @field_validator('group_ids', mode='before')
    @classmethod
    def convert_group_ids(cls, v):
        if not v:
            raise ValueError("group_ids cannot be empty")
        try:
            return [int(id) for id in v]
        except (ValueError, TypeError):
            raise ValueError(f"Invalid integer list for group_ids: {v}")

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    course_id: Optional[int] = None
    teacher_id: Optional[int] = None
    group_ids: Optional[List[int]] = None
    start_date: Optional[date] = None
    status: Optional[SessionStatus] = None

class SessionResponse(SessionBase):
    id: int

    @classmethod
    def from_orm(cls, obj):
        # Convert the enum to its string value for validation
        data = obj.__dict__.copy()
        if 'status' in data and isinstance(data['status'], Enum):
            data['status'] = data['status'].value
        return cls(**data)

    model_config = ConfigDict(from_attributes=True)

from app.schemas.course import CourseResponse
SessionResponse.update_forward_refs()