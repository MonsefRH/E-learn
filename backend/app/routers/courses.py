from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configs.db import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from app.services.course_service import create_course, update_course, delete_course, activate_course, get_course_by_id
from typing import List
from app.models.course import Course

router = APIRouter(prefix="/admin/courses", tags=["admin_courses"])

def ensure_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

@router.post("/", response_model=CourseResponse)
def create_new_course(course: CourseCreate, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    print(f"Received course data: {course.dict()}")  # Debug: Log raw input
    print(f"Course model fields: {CourseCreate.__fields__}")  # Debug line
    return create_course(db, course)

@router.get("/", response_model=List[CourseResponse])
def list_courses(db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return db.query(Course).all()

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    course = get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse.from_orm(course)

@router.put("/{course_id}", response_model=CourseResponse)
def update_existing_course(course_id: int, course: CourseUpdate, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return update_course(db, course_id, course)

@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_course(course_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    delete_course(db, course_id)

@router.post("/{course_id}/activate", response_model=CourseResponse)
def activate_existing_course(course_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return activate_course(db, course_id)