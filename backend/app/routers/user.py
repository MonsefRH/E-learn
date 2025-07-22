from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.configs.db import get_db
from app.models.user import User
from .auth import get_current_user, verify_password, pwd_context, create_access_token
from app.services.user_service import get_user_by_username, create_user, get_all_users, delete_user

from ..models.learner import Learner
from ..schemas.user import UserCreate, LearnerCreate
from ..services.user_service import create_learner

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

# Modèles Pydantic pour la validation des données
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateUserRequest(BaseModel):
    username: str = None
    email: str = None


class UpdateUserReq(BaseModel):
    id: int = None
    username: str = None
    email: str = None
    level: str = None



def ensure_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

@router.put("/change-password")
async def change_password(
        request: ChangePasswordRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
        _=Depends(ensure_admin)
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    hashed_new_password = pwd_context.hash(request.new_password)
    current_user.password_hash = hashed_new_password
    db.commit()
    db.refresh(current_user)

    # Optionnel : Générer un nouveau token d'accès après le changement de mot de passe
    access_token = create_access_token(data={"sub": current_user.username})
    response = {
        "access_token": access_token,
        "token_type": "bearer"
    }

    return response


@router.put("/update-account")
async def update_my_account(
        request: UpdateUserRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
        _=Depends(ensure_admin)
):
    # Vérifier qu'au moins un champ est fourni
    if not request.username and not request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field (username or email) must be provided"
        )

    # Vérifier l'unicité de l'username si fourni
    if request.username:
        existing_user = db.query(User).filter(
            User.username == request.username,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )
        current_user.username = request.username

    # Vérifier l'unicité de l'email si fourni
    if request.email:
        existing_user = db.query(User).filter(
            User.email == request.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists"
            )
        current_user.email = request.email


    db.commit()
    db.refresh(current_user)

    # Optionnel : Générer un nouveau token d'accès après le changement de mot de passe
    access_token = create_access_token(data={"sub": current_user.username})


    return {
        "message": "User updated successfully",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
        },
        "access_token": access_token,
        "token_type": "bearer"
    }




@router.put("/update")
async def update_user(
        request: UpdateUserReq,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
        _=Depends(ensure_admin)
):
    user = db.query(User).filter(User.id == request.id).first()
    learner = db.query(Learner).filter(Learner.id == request.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Vérifier l'unicité de l'username si fourni
    if request.username:
        existing_user = db.query(User).filter(
            User.username == request.username,
            User.id != user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )
        user.username = request.username

    # Vérifier l'unicité de l'email si fourni
    if request.email:
        existing_user = db.query(User).filter(
            User.email == request.email,
            User.id != user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists"
            )
        user.email = request.email

    # Mettre à jour le niveau si fourni
    if request.level:
        learner.level = request.level

    db.commit()
    db.refresh(user)
    db.refresh(learner)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "level": learner.level
        }
    }




@router.get("/get-all")
async def list_all_users(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
        _=Depends(ensure_admin)
):
    users = db.query(User).all()
    result = []

    for user in users:
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at" : user.created_at,
        }

        # Add level if user is a learner
        if user.role == "learner":
            learner = db.query(Learner).filter(Learner.id == user.id).first()
            if learner:
                user_data["level"] = learner.level

        result.append(user_data)


    return result



@router.post("/create")
async def create_user_endpoint(
        request: LearnerCreate,
        db: Session = Depends(get_db),
        _=Depends(ensure_admin)
):
    user = get_user_by_username(db, request.username)
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )
    if not request.level :
        new_user = create_user(db, request)
        return {
            "message": "User created successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "role": new_user.role
            }
        }
    else :
        new_user = create_learner(db, request)
        return {
            "message": "User created successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "role": new_user.role,
                "level": new_user.level
            }
        }

@router.delete("/delete/{user_id}")
async def deleteUser(
        user_id: int,
        db: Session = Depends(get_db),
        _=Depends(ensure_admin)
):
    delete_user(db, user_id)
    return {"message": "User deleted successfully"}

