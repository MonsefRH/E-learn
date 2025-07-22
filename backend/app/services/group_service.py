from sqlalchemy.orm import Session
from app.models.group import Group, user_group
from app.models.user import User
from app.schemas.group import GroupCreate, GroupUpdate, GroupResponse
from fastapi import HTTPException, status

def get_group_by_id(db: Session, group_id: int) -> Group | None:
    return db.query(Group).filter(Group.id == group_id).first()

def get_groups(db: Session) -> list[GroupResponse]:
    return [GroupResponse.from_orm(group) for group in db.query(Group).options().all()]

def create_group(db: Session, group: GroupCreate) -> GroupResponse:
    db_group = Group(name=group.name, description=group.description)
    if group.user_ids:
        users = db.query(User).filter(User.id.in_(group.user_ids)).all()
        if len(users) != len(group.user_ids):
            raise HTTPException(status_code=400, detail="One or more user IDs are invalid")
        db_group.users = users
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return GroupResponse.from_orm(db_group)

def update_group(db: Session, group_id: int, group_update: GroupUpdate) -> GroupResponse:
    db_group = get_group_by_id(db, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    update_data = group_update.dict(exclude_unset=True)
    if "user_ids" in update_data:
        if update_data["user_ids"]:
            users = db.query(User).filter(User.id.in_(update_data["user_ids"])).all()
            if len(users) != len(update_data["user_ids"]):
                raise HTTPException(status_code=400, detail="One or more user IDs are invalid")
            db_group.users = users
        else:
            db_group.users = []
        del update_data["user_ids"]
    for key, value in update_data.items():
        setattr(db_group, key, value)
    db.commit()
    db.refresh(db_group)
    return GroupResponse.from_orm(db_group)

def delete_group(db: Session, group_id: int):
    db_group = get_group_by_id(db, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(db_group)
    db.commit()