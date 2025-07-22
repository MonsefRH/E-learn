from sqlalchemy import Column, Integer, String, DateTime, Table,ForeignKey
from sqlalchemy.orm import relationship
from app.configs.db import Base
from datetime import datetime

# Association table for many-to-many relationship between User and Group
user_group = Table(
    "user_group",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("group_id", Integer, ForeignKey("groups.id"), primary_key=True)
)

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    users = relationship("User", secondary=user_group, back_populates="groups")