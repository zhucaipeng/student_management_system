from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Class, Student
from schemas import ClassCreate, ClassResponse
from auth import require_admin, require_teacher_or_admin

router = APIRouter(prefix="/class", tags=["班级管理"])

@router.post("/", response_model=ClassResponse)
def create_class(class_data: ClassCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """创建班级（仅管理员）"""
    # 检查班级名是否已存在
    existing_class = db.query(Class).filter(Class.class_name == class_data.class_name).first()
    if existing_class:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="班级名称已存在"
        )
    
    new_class = Class(**class_data.dict())
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    
    return ClassResponse.from_orm(new_class)

@router.get("/", response_model=List[ClassResponse])
def get_classes(db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    """获取所有班级"""
    classes = db.query(Class).all()
    return [ClassResponse.from_orm(cls) for cls in classes]

@router.get("/{class_id}", response_model=ClassResponse)
def get_class(class_id: int, db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    """获取单个班级信息"""
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="班级不存在"
        )
    return ClassResponse.from_orm(cls)

@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """删除班级（仅管理员）"""
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="班级不存在"
        )
    
    # 检查班级是否有学生
    student_count = db.query(Student).filter(Student.class_id == class_id).count()
    if student_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"班级中有{student_count}名学生，无法删除"
        )
    
    db.delete(cls)
    db.commit()
    return {"message": "班级删除成功"}
@router.put("/{class_id}", response_model=ClassResponse)
def update_class(class_id: int, class_data: ClassCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """更新班级信息（仅管理员）"""
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="班级不存在"
        )
    
    # 检查班级名是否已被其他班级使用
    existing_class = db.query(Class).filter(Class.class_name == class_data.class_name, Class.id != class_id).first()
    if existing_class:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="班级名称已存在"
        )
    
    cls.class_name = class_data.class_name
    cls.head_teacher = class_data.head_teacher
    db.commit()
    db.refresh(cls)
    
    return ClassResponse.from_orm(cls)
