from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, Base
from api import auth, class_router, student, score
import os

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 创建FastAPI应用
app = FastAPI(
    title="学生管理系统",
    description="基于FastAPI的学生管理系统，支持学生信息管理、成绩管理等功能",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api")
app.include_router(class_router.router, prefix="/api")
app.include_router(student.router, prefix="/api")
app.include_router(score.router, prefix="/api")

# 静态文件夹路径
static_dir = os.path.join(os.path.dirname(__file__), "static")

# 挂载静态文件
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 根路径返回登录页面
@app.get("/")
async def root():
    login_page = os.path.join(static_dir, "login.html")
    if os.path.exists(login_page):
        return FileResponse(login_page)
    else:
        return {
            "message": "欢迎使用学生管理系统",
            "docs": "/docs",
            "api_prefix": "/api"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

@app.delete("/api/score/{score_id}")
def delete_score(score_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_score = db.query(models.Score).filter(models.Score.id == score_id).first()
    if db_score is None:
        raise HTTPException(status_code=404, detail="Score not found")
    db.delete(db_score)
    db.commit()
    return {"message": "Score deleted successfully"}
