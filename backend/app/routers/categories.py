from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configs.db import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.category_service import create_category, update_category, delete_category, get_category_by_id
from typing import List

from app.models.category import Category

router = APIRouter(prefix="/admin/categories", tags=["admin_categories"])

def ensure_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

@router.post("/", response_model=CategoryResponse)
def create_new_category(category: CategoryCreate, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return create_category(db, category)

@router.get("/", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    category = get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return CategoryResponse.from_orm(category)

@router.put("/{category_id}", response_model=CategoryResponse)
def update_existing_category(category_id: int, category: CategoryUpdate, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return update_category(db, category_id, category)

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_category(category_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    delete_category(db, category_id)