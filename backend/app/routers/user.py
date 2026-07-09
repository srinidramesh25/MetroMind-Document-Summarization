from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(
    prefix="/users",
    tags=["User & Organization Management"]
)

# --- Department Endpoints ---
@router.get("/departments", response_model=List[schemas.DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()

# --- Role Endpoints ---
@router.get("/roles", response_model=List[schemas.RoleOut])
def get_roles(db: Session = Depends(get_db)):
    return db.query(models.Role).all()

# --- User Management Endpoints ---
@router.get("", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Only Admin (Super or Department) can view users
    user_role = current_user.role_rel.name if current_user.role_rel else ""
    if user_role not in ["Super Admin", "Department Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view user directories."
        )

    query = db.query(models.User)
    if user_role == "Department Admin":
        query = query.filter(models.User.department_id == current_user.department_id)
        
    return query.all()

@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Only Super Admin can modify users
    user_role = current_user.role_rel.name if current_user.role_rel else ""
    if user_role != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User management edits are restricted to Super Administrators."
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.name is not None:
        user.name = user_update.name
    if user_update.status is not None:
        user.status = user_update.status
    if user_update.role_id is not None:
        user.role_id = user_update.role_id
    if user_update.department_id is not None:
        user.department_id = user_update.department_id

    db.commit()
    db.refresh(user)
    return user

# --- Notification System Endpoints ---
@router.get("/notifications", response_model=List[schemas.Notification])
def get_my_notifications(
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(models.Notification.read_status == False)
    return query.order_by(models.Notification.created_at.desc()).all()

@router.post("/notifications/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.read_status == False
    ).update({"read_status": True}, synchronize_session=False)
    db.commit()
    return {"detail": "All notifications marked as read."}
