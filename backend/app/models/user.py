from datetime import datetime
from sqlalchemy import Column, Integer, String
from app.configs.db import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import DateTime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    groups = relationship("Group", secondary="user_group", back_populates="users")