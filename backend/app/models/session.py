from sqlalchemy import Column, Integer, ForeignKey, Date, Enum, ARRAY, Boolean, String
from sqlalchemy.orm import relationship
from app.configs.db import Base
from enum import Enum as PyEnum

class SessionStatus(PyEnum):
    PENDING = "PENDING"
    VALIDATED = "VALIDATED"
    AVAILABLE = "AVAILABLE"

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_ids = Column(ARRAY(Integer), nullable=False)
    start_date = Column(Date, nullable=False)
    status = Column(Enum(SessionStatus), nullable=False, default=SessionStatus.PENDING)
    level = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    axes = Column(ARRAY(String), nullable=True)
    content_generated = Column(Boolean, nullable=False, default=False)
    language = Column(String, nullable=True, default="en")  # Add language field with default "en"
    course = relationship("Course", back_populates="sessions")
    teacher = relationship("User", foreign_keys=[teacher_id])