from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime, Integer
from sqlalchemy.orm import relationship
from app.configs.db import Base

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    is_active = Column(Boolean, default=False)
    deadline = Column(DateTime, nullable=True)
    category = relationship("Category", back_populates="courses")
    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="course")