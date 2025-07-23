from sqlalchemy.orm import Session
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.services.category_service import get_category_by_id
from fastapi import HTTPException, status
from datetime import datetime

def get_course_by_id(db: Session, course_id: int) -> Course | None:
    return db.query(Course).filter(Course.id == course_id).first()

def get_courses(db: Session) -> list[CourseResponse]:
    return [CourseResponse.from_orm(course) for course in db.query(Course).all()]

def create_course(db: Session, course: CourseCreate) -> CourseResponse:
    if not get_category_by_id(db, course.category_id):
        raise HTTPException(status_code=400, detail="Invalid category_id")
    db_course = Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return CourseResponse.from_orm(db_course)

def update_course(db: Session, course_id: int, course_update: CourseUpdate) -> CourseResponse:
    db_course = get_course_by_id(db, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course_update.category_id and not get_category_by_id(db, course_update.category_id):
        raise HTTPException(status_code=400, detail="Invalid category_id")
    update_data = course_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    db.commit()
    db.refresh(db_course)
    return CourseResponse.from_orm(db_course)

def delete_course(db: Session, course_id: int):
    db_course = get_course_by_id(db, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(db_course)
    db.commit()

def activate_course(db: Session, course_id: int):
    db_course = get_course_by_id(db, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    if db_course.deadline and db_course.deadline < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Activation deadline expired")
    db_course.is_active = True
    db.commit()
    db.refresh(db_course)
    return CourseResponse.from_orm(db_course)