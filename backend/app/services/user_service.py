import datetime

from sqlalchemy.orm import Session
from app.models.user import User
from app.models.learner import Learner
from app.schemas.user import UserCreate, LearnerCreate
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_username(db: Session, username: str):
    user = db.query(User).filter(User.username == username).first()
    return user

def create_user(db: Session, user: UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role= user.role,
        created_at= datetime.datetime.now()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_learner(db: Session, user: LearnerCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = Learner(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role='learner',
        created_at=datetime.datetime.now(),
        level= user.level
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_all_users(db: Session):
    for user in db.query(User).all():
        user.password_hash = None
    return db.query(User).all()




def change_user_password(db: Session, user_id: int, new_password: str, current_password: str):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    if not pwd_context.verify(current_password, user.password_hash):
        return None
    user.password_hash = pwd_context.hash(new_password)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    learners = db.query(Learner).filter(Learner.id == user_id).first()

    if learners:
        db.delete(learners)

    if not user:
        return None
    db.delete(user)
    db.commit()
    return user
