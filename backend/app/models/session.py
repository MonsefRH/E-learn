from sqlalchemy import Column, Integer, ForeignKey, Date, Enum, ARRAY
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
   course = relationship("Course", back_populates="sessions")
   teacher = relationship("User", foreign_keys=[teacher_id])