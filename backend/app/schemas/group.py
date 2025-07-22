from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GroupBase(BaseModel):
    name: str = Field(..., description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    user_ids: Optional[List[int]] = Field(None, description="List of user IDs in the group")

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    user_ids: Optional[List[int]] = None

class GroupResponse(GroupBase):
    id: int
    created_at: datetime
    user_ids: List[int] = Field(default_factory=list)  # Ensure default empty list

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, group):
        obj = super().from_orm(group)
        obj.user_ids = [user.id for user in group.users] if group.users else []
        return obj