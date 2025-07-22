from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel, SessionStatus
from app.models.user import User
from app.models.course import Course
from app.models.group import Group
from app.schemas.session import SessionCreate, SessionUpdate, SessionResponse
from fastapi import HTTPException, status
from datetime import date

def get_session_by_id(db: Session, session_id: int) -> SessionModel | None:
    return db.query(SessionModel).filter(SessionModel.id == session_id).first()

def get_sessions(db: Session) -> list[SessionResponse]:
    return [SessionResponse.from_orm(session) for session in db.query(SessionModel).all()]

def create_session(db: Session, session: SessionCreate) -> SessionResponse:
    course = db.query(Course).filter(Course.id == session.course_id).first()
    teacher = db.query(User).filter(User.id == session.teacher_id, User.role == "trainer").first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not teacher:
        raise HTTPException(status_code=400, detail="Invalid or non-teacher ID")
    # Verify groups exist
    for group_id in session.group_ids:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=400, detail=f"Group with ID {group_id} not found")
    db_session = SessionModel(**session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return SessionResponse.from_orm(db_session)

def update_session(db: Session, session_id: int, session_update: SessionUpdate) -> SessionResponse:
    db_session = get_session_by_id(db, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session_update.course_id:
        course = db.query(Course).filter(Course.id == session_update.course_id).first()
        if not course:
            raise HTTPException(status_code=400, detail="Invalid course_id")
    if session_update.teacher_id:
        teacher = db.query(User).filter(User.id == session_update.teacher_id, User.role == "trainer").first()
        if not teacher:
            raise HTTPException(status_code=400, detail="Invalid or non-teacher ID")
    if session_update.group_ids:
        for group_id in session_update.group_ids:
            group = db.query(Group).filter(Group.id == group_id).first()
            if not group:
                raise HTTPException(status_code=400, detail=f"Group with ID {group_id} not found")
    update_data = session_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_session, key, value)
    db.commit()
    db.refresh(db_session)
    return SessionResponse.from_orm(db_session)

def delete_session(db: Session, session_id: int):
    db_session = get_session_by_id(db, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(db_session)
    db.commit()