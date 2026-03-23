from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Student, User, Class, Score
from schemas import StudentCreate, StudentResponse
from auth import require_admin, require_teacher_or_admin, get_password_hash

router = APIRouter(prefix="/student", tags=["学生管理"])

@router.post("/", response_model=StudentResponse)
def create_student(student_data: StudentCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """创建学生（仅管理员）"""
    existing_student = db.query(Student).filter(Student.stu_no == student_data.stu_no).first()
    if existing_student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="学号已存在")
    
    cls = db.query(Class).filter(Class.id == student_data.class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")
    
    default_password = student_data.stu_no[-6:] if len(student_data.stu_no) >= 6 else student_data.stu_no
    hashed_password = get_password_hash(default_password)
    
    new_user = User(username=student_data.stu_no, password=hashed_password, role="student")
    db.add(new_user)
    db.flush()
    
    new_student = Student(
        stu_no=student_data.stu_no, name=student_data.name, gender=student_data.gender,
        birthday=student_data.birthday, class_id=student_data.class_id, 
        phone=student_data.phone, user_id=new_user.id
    )
    db.add(new_student)
    cls.student_count += 1
    db.commit()
    db.refresh(new_student)
    
    response = StudentResponse.from_orm(new_student)
    response.class_name = cls.class_name
    return response

@router.get("/", response_model=List[StudentResponse])
def get_students(class_id: Optional[int] = None, db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    query = db.query(Student)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    students = query.all()
    result = []
    for student in students:
        response = StudentResponse.from_orm(student)
        cls = db.query(Class).filter(Class.id == student.class_id).first()
        if cls:
            response.class_name = cls.class_name
        result.append(response)
    return result

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")
    response = StudentResponse.from_orm(student)
    cls = db.query(Class).filter(Class.id == student.class_id).first()
    if cls:
        response.class_name = cls.class_name
    return response

@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """删除学生（仅管理员）"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")
    
    # 先删除该学生的所有成绩记录
    db.query(Score).filter(Score.stu_id == student_id).delete()
    
    # 删除关联的用户
    if student.user_id:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            db.delete(user)
    
    # 更新班级学生数量
    cls = db.query(Class).filter(Class.id == student.class_id).first()
    if cls:
        cls.student_count -= 1
    
    db.delete(student)
    db.commit()
    
    return {"message": "学生删除成功"}

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, student_data: dict, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """更新学生信息（仅管理员）"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")
    
    # 只更新允许修改的字段
    if "name" in student_data:
        student.name = student_data["name"]
    if "gender" in student_data:
        student.gender = student_data["gender"]
    if "phone" in student_data:
        student.phone = student_data["phone"]
    
    db.commit()
    db.refresh(student)
    
    response = StudentResponse.from_orm(student)
    cls = db.query(Class).filter(Class.id == student.class_id).first()
    if cls:
        response.class_name = cls.class_name
    return response
