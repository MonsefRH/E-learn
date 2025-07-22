import os
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()

# Set Google credentials BEFORE importing any modules that use Google Cloud
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_CREDENTIALS_PATH", "")

# Now import modules that use Google Cloud
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, courses, slides, lessons, categories, user, qa
from app.configs.db import init_db
from app.models.user import User
from app.models.category import Category
from app.models.course import Course
from app.models.lesson import Lesson

app = FastAPI(title="AI-Powered E-Learning Platform Backend")

# CORS configuration to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
init_db()

# Include routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(slides.router)
app.include_router(lessons.router)
app.include_router(user.router)
app.include_router(categories.router)
app.include_router(qa.router, prefix="/qa")  # Explicitly set prefix to avoid conflicts

@app.get("/")
async def root():
    return {"message": "Welcome to the AI-Powered E-Learning Platform Backend"}