from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
import datetime

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )

    # Verify role exists
    role = db.query(models.Role).filter(models.Role.id == user_in.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected security role does not exist."
        )

    # Verify department exists if provided
    if user_in.department_id:
        dept = db.query(models.Department).filter(models.Department.id == user_in.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected department does not exist."
            )

    hashed_password = auth.get_password_hash(user_in.password)
    new_user = models.User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_password,
        role_id=user_in.role_id,
        department_id=user_in.department_id,
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Write audit log
    audit_log = models.AuditLog(
        user_id=new_user.id,
        action="USER_REGISTRATION",
        details=f"User {new_user.email} registered with role: {role.name}",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support."
        )

    # Create access token
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role_rel.name}
    )

    # Write audit log
    audit_log = models.AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        details=f"User {user.email} logged in successfully.",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role_rel.name,
        "name": user.name,
        "email": user.email,
        "department_id": user.department_id
    }

@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
