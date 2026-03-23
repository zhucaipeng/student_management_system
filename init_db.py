"""
数据库初始化脚本
创建初始管理员账号和示例数据
"""
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, Class, Student, UserRole, Gender
from auth import get_password_hash

def init_database():
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # 检查是否已有管理员
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            # 创建管理员账号
            admin = User(
                username="admin",
                password=get_password_hash("admin123"),
                role=UserRole.ADMIN
            )
            db.add(admin)
            print("[OK] 创建管理员账号: admin / admin123")
        
        else:
            print("[INFO] 管理员账号已存在")
        
        # 检查是否已有班级
        classes = db.query(Class).all()
        if not classes:
            # 创建示例班级
            class1 = Class(
                class_name="一年级1班",
                head_teacher="张老师",
                student_count=0
            )
            class2 = Class(
                class_name="二年级1班",
                head_teacher="李老师",
                student_count=0
            )
            db.add(class1)
            db.add(class2)
            db.flush()  # 获取班级ID
            print("[OK] 创建示例班级: 一年级1班, 二年级1班")
        else:
            print("[INFO] 班级数据已存在")
        
        # 提交更改
        db.commit()
        print("\n[SUCCESS] 数据库初始化完成！")
        print("\n[INFO] 默认登录信息:")
        print("   用户名: admin")
        print("   密码: admin123")
        print("   访问地址: http://localhost:8000/docs")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] 初始化失败: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()