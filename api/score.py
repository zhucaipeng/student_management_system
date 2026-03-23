from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Score, Student
from schemas import ScoreCreate, ScoreResponse
from auth import require_admin, require_teacher_or_admin
from fastapi import Body

router = APIRouter(prefix="/score", tags=["成绩管理"])

@router.post("/", response_model=ScoreResponse)
def create_score(score_data: ScoreCreate, db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    """录入成绩"""
    student = db.query(Student).filter(Student.id == score_data.stu_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")
    
    new_score = Score(**score_data.dict())
    db.add(new_score)
    try:
        db.commit()
        db.refresh(new_score)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该学生该课程该日期该考试类型已有成绩")
    
    response = ScoreResponse.from_orm(new_score)
    response.student_name = student.name
    return response

@router.post("/batch", response_model=List[ScoreResponse])
async def create_scores_batch(scores: List[ScoreCreate] = Body(...), db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    """批量录入成绩"""
    created_scores = []
    errors = []
    
    for i, score_data in enumerate(scores):
        try:
            # 检查学生是否存在
            student = db.query(Student).filter(Student.id == score_data.stu_id).first()
            if not student:
                errors.append(f"第{i+1}条：学生不存在")
                continue
            
            new_score = Score(**score_data.dict())
            db.add(new_score)
            db.flush()  # 尝试写入，检查唯一性约束
            created_scores.append(new_score)
        except Exception as e:
            db.rollback()
            errors.append(f"第{i+1}条：该学生该课程该日期该考试类型已有成绩")
    
    if created_scores:
        try:
            db.commit()
            for score in created_scores:
                db.refresh(score)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="批量录入失败，可能存在重复成绩")
    
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))
    
    # 添加学生姓名
    result = []
    for score in created_scores:
        response = ScoreResponse.from_orm(score)
        student = db.query(Student).filter(Student.id == score.stu_id).first()
        if student:
            response.student_name = student.name
        result.append(response)
    
    return result

@router.get("/", response_model=List[ScoreResponse])
def get_scores(stu_id: Optional[int] = None, course_name: Optional[str] = None, exam_time: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    query = db.query(Score)
    if stu_id:
        query = query.filter(Score.stu_id == stu_id)
    if course_name:
        query = query.filter(Score.course_name == course_name)
    if exam_time:
        query = query.filter(Score.exam_time == exam_time)
    scores = query.all()
    result = []
    for score in scores:
        response = ScoreResponse.from_orm(score)
        student = db.query(Student).filter(Student.id == score.stu_id).first()
        if student:
            response.student_name = student.name
        result.append(response)
    return result

@router.get("/{score_id}", response_model=ScoreResponse)
def get_score(score_id: int, db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成绩不存在")
    response = ScoreResponse.from_orm(score)
    student = db.query(Student).filter(Student.id == score.stu_id).first()
    if student:
        response.student_name = student.name
    return response

@router.put("/{score_id}", response_model=ScoreResponse)
def update_score(score_id: int, score_data: ScoreCreate, db: Session = Depends(get_db), current_user = Depends(require_teacher_or_admin)):
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成绩不存在")
    for key, value in score_data.dict().items():
        setattr(score, key, value)
    db.commit()
    db.refresh(score)
    response = ScoreResponse.from_orm(score)
    student = db.query(Student).filter(Student.id == score.stu_id).first()
    if student:
        response.student_name = student.name
    return response

@router.delete("/{score_id}")
def delete_score(score_id: int, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    score = db.query(Score).filter(Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成绩不存在")
    db.delete(score)
    db.commit()
    return {"message": "成绩删除成功"}
