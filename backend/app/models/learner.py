from sqlalchemy import Column, Integer, String, ForeignKey

from app.models.user import User


class Learner(User):
    __tablename__ = "learners"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    level = Column(String, nullable=False)


