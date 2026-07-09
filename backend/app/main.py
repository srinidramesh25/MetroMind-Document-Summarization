import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app import models, auth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Auto-create tables (SQLite or MySQL depending on config env)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Document Intelligence & Decision Support System for Kochi Metro Rail Limited (KMRL)",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB Seeding Event
@app.on_event("startup")
def seed_database():
    db = SessionLocal()
    try:
        # 1. Seed Roles
        roles = [
            {"name": "Super Admin", "description": "Full system management, compliance and analytics access"},
            {"name": "Department Admin", "description": "Manage department folders and review logs"},
            {"name": "Employee", "description": "Upload files, search knowledge base, chat with documents"}
        ]
        db_roles = []
        for r in roles:
            db_role = db.query(models.Role).filter(models.Role.name == r["name"]).first()
            if not db_role:
                db_role = models.Role(name=r["name"], description=r["description"])
                db.add(db_role)
                db.commit()
                db.refresh(db_role)
            db_roles.append(db_role)
            
        # 2. Seed Departments
        depts = [
            {"code": "OPS", "name": "Operations", "description": "Operations control, scheduling, viaduct operations"},
            {"code": "HR", "name": "HR & Administration", "description": "Personnel management, shift rotations, policies"},
            {"code": "FIN", "name": "Finance & Accounts", "description": "Taxes, budgets, maintenance cost ledger"},
            {"code": "LEG", "name": "Legal Cell", "description": "Contracts, statutory rules, regulatory compliance"},
            {"code": "PRC", "name": "Procurement", "description": "Tenders, material purchase, vendor evaluation"},
            {"code": "MNT", "name": "Maintenance", "description": "Track alignment, signaling, rolling stock"},
            {"code": "SAF", "name": "Safety & Quality", "description": "Safety audits, emergency signage, hazard checks"},
            {"code": "COM", "name": "Compliance Control", "description": "Internal audit tracking, risk logging"},
            {"code": "TEC", "name": "Technical Reports", "description": "Engineering works, electrical alignment"},
            {"code": "PRJ", "name": "Project Management", "description": "Phase extensions, metro civil planning"}
        ]
        for d in depts:
            db_dept = db.query(models.Department).filter(models.Department.code == d["code"]).first()
            if not db_dept:
                db_dept = models.Department(code=d["code"], name=d["name"], description=d["description"])
                db.add(db_dept)
        db.commit()

        # 3. Seed Categories
        categories = [
            "Operations", "HR", "Finance", "Legal", "Procurement", 
            "Maintenance", "Safety", "Compliance", "Technical Reports", "Project Documents"
        ]
        for c in categories:
            db_cat = db.query(models.Category).filter(models.Category.name == c).first()
            if not db_cat:
                db_cat = models.Category(name=c, description=f"Document category: {c}")
                db.add(db_cat)
        db.commit()

        # Resolve role ids for default accounts
        super_admin_role = db.query(models.Role).filter(models.Role.name == "Super Admin").first()
        employee_role = db.query(models.Role).filter(models.Role.name == "Employee").first()
        ops_dept = db.query(models.Department).filter(models.Department.code == "OPS").first()

        # 4. Seed Default Admin Account
        admin_email = "admin@kmrl.co.in"
        db_admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if not db_admin and super_admin_role and ops_dept:
            db_admin = models.User(
                name="KMRL Super Administrator",
                email=admin_email,
                hashed_password=auth.get_password_hash("adminpassword"),
                role_id=super_admin_role.id,
                department_id=ops_dept.id,
                status="active"
            )
            db.add(db_admin)
            db.commit()

        # 5. Seed Default Employee Account
        emp_email = "employee@kmrl.co.in"
        db_emp = db.query(models.User).filter(models.User.email == emp_email).first()
        if not db_emp and employee_role and ops_dept:
            db_emp = models.User(
                name="KMRL Operations Officer",
                email=emp_email,
                hashed_password=auth.get_password_hash("employeepassword"),
                role_id=employee_role.id,
                department_id=ops_dept.id,
                status="active"
            )
            db.add(db_emp)
            db.commit()

        logger.info("Database seeded successfully with roles, departments, and default accounts.")
    except Exception as e:
        logger.error(f"Error seeding database: {str(e)}")
    finally:
        db.close()

# Include Routers
from app.routers import auth as auth_router
from app.routers import documents as docs_router
from app.routers import chat as chat_router
from app.routers import search as search_router
from app.routers import analytics as analytics_router
from app.routers import compliance as compliance_router
from app.routers import user as user_router

app.include_router(auth_router.router, prefix=settings.API_V1_STR)
app.include_router(docs_router.router, prefix=settings.API_V1_STR)
app.include_router(chat_router.router, prefix=settings.API_V1_STR)
app.include_router(search_router.router, prefix=settings.API_V1_STR)
app.include_router(analytics_router.router, prefix=settings.API_V1_STR)
app.include_router(compliance_router.router, prefix=settings.API_V1_STR)
app.include_router(user_router.router, prefix=settings.API_V1_STR)

# WebSocket Notification System
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive by listening for ping-like responses
            data = await websocket.receive_text()
            # Loopback message
            await websocket.send_text(f"Server acknowledged: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "MetroMind AI - Kochi Metro Rail Limited",
        "api_documentation": f"/docs"
    }
