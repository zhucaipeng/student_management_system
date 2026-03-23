from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class Gender(str, enum.Enum):
    MALE = "男"
    FEMALE = "女"

class ExamType(str, enum.Enum):
    MIDTERM = "期中考试"
    FINAL = "期末考试"
    UNIT = "单元测试"
    MOCK = "模拟考试"
    DAILY = "平时测验"

class User(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(20), unique=True, index=True, nullable=False)
    password = Column(String(64), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    create_time = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("Student", back_populates="user", uselist=False)

class Class(Base):
    __tablename__ = "class"
    
    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String(20), unique=True, index=True, nullable=False)
    head_teacher = Column(String(20), nullable=False)
    student_count = Column(Integer, default=0)
    
    students = relationship("Student", back_populates="class_info")

class Student(Base):
    __tablename__ = "student"
    
    id = Column(Integer, primary_key=True, index=True)
    stu_no = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(20), nullable=False)
    gender = Column(SQLEnum(Gender), nullable=False)
    birthday = Column(String(10))
    class_id = Column(Integer, ForeignKey("class.id"), nullable=False)
    phone = Column(String(11))
    user_id = Column(Integer, ForeignKey("user.id"), unique=True)
    
    class_info = relationship("Class", back_populates="students")
    user = relationship("User", back_populates="student")
    scores = relationship("Score", back_populates="student")

class Score(Base):
    __tablename__ = "score"
    
    id = Column(Integer, primary_key=True, index=True)
    stu_id = Column(Integer, ForeignKey("student.id"), nullable=False)
    course_name = Column(String(20), nullable=False)
    score = Column(Float, nullable=False)
    exam_time = Column(String(10), nullable=False)
    exam_type = Column(SQLEnum(ExamType), nullable=False, default=ExamType.DAILY)
    
    student = relationship("Student", back_populates="scores")
    
    __table_args__ = (
        Index("idx_unique_score", "stu_id", "course_name", "exam_time", "exam_type", unique=True),
    )
