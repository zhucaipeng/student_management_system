from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from models import UserRole, Gender, ExamType

# 用户相关Schema
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    role: UserRole

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    create_time: datetime
    
    class Config:
        from_attributes = True

# 班级相关Schema
class ClassBase(BaseModel):
    class_name: str = Field(..., min_length=1, max_length=20)
    head_teacher: str = Field(..., min_length=1, max_length=20)

class ClassCreate(ClassBase):
    pass

class ClassResponse(ClassBase):
    id: int
    student_count: int
    
    class Config:
        from_attributes = True

# 学生相关Schema
class StudentBase(BaseModel):
    stu_no: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=20)
    gender: Gender
    birthday: Optional[str] = None
    class_id: int
    phone: Optional[str] = None

class StudentCreate(StudentBase):
    password: Optional[str] = None  # 可选，不提供则使用默认密码

class StudentResponse(StudentBase):
    id: int
    user_id: Optional[int] = None
    class_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# 成绩相关Schema
class ScoreBase(BaseModel):
    stu_id: int
    course_name: str = Field(..., min_length=1, max_length=20)
    score: float = Field(..., ge=0, le=100)
    exam_time: str  # 格式: YYYY-MM-DD
    exam_type: ExamType = ExamType.DAILY

class ScoreCreate(ScoreBase):
    pass

class ScoreResponse(ScoreBase):
    id: int
    student_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# 登录Schema
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
