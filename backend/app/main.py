from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, courses, lessons, categories, user, qa, sessions,groups
from app.configs.db import init_db
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.group import Group
from app.models.session import Session
from backend.app.routers import presentations

app = FastAPI(title="AI-Powered E-Learning Platform Backend")

# CORS configuration to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Include routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(presentations.router)
app.include_router(lessons.router)
app.include_router(user.router)
app.include_router(categories.router)
app.include_router(qa.router, prefix="/qa")
app.include_router(sessions.router)
app.include_router(groups.router)


@app.get("/")
async def root():
    return {"message": "Welcome to the AI-Powered E-Learning Platform Backend"}