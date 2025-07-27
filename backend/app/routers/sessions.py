from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.configs.db import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.services.session_service import create_session, update_session, delete_session, get_session_by_id, get_sessions
from typing import List

router = APIRouter(prefix="/admin/sessions", tags=["admin_sessions"])

def ensure_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

@router.post("/", response_model=SessionResponse)
def create_new_session(session: SessionCreate, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    return create_session(db, session)

@router.get("/", response_model=List[SessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    return get_sessions(db)

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    session = get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.from_orm(session)

@router.put("/{session_id}", response_model=SessionResponse)
def update_existing_session(session_id: int, session: SessionUpdate, db: Session = Depends(get_db)):
    return update_session(db, session_id, session)

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_session(session_id: int, db: Session = Depends(get_db), _=Depends(ensure_admin)):
    delete_session(db, session_id)