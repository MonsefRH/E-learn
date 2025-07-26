from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configs.db import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate
from app.services.group_service import create_group, update_group, delete_group, get_group_by_id, get_groups
from typing import List

router = APIRouter(prefix="/admin/groups", tags=["admin_groups"])

def ensure_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

@router.post("/", response_model=GroupResponse)
def create_new_group(group: GroupCreate, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return create_group(db, group)

@router.get("/", response_model=List[GroupResponse])
def list_groups(db: Session = Depends(get_db)):
    return get_groups(db)

@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return GroupResponse.from_orm(group)

@router.put("/{group_id}", response_model=GroupResponse)
def update_existing_group(group_id: int, group: GroupUpdate, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return update_group(db, group_id, group)

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_group(group_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    delete_group(db, group_id)