from fastapi import APIRouter, Depends, HTTPException
from fastapi.params import Path
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from typing import List
import os
import json
from app.configs.db import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.courseRequest import CourseRequest
from app.services.slides_service import generate_content
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/slides", tags=["slides"])

@router.get("/api/presentations/{session_id}/slides")
async def get_slides_data(session_id: str):
    try:
        slides_file_path = f"presentations/{session_id}/slides.json"
        if not os.path.exists(slides_file_path):
            raise HTTPException(status_code=404, detail="Slides data not found")
        with open(slides_file_path, 'r', encoding='utf-8') as file:
            slides_data = json.load(file)
        return {"slides": slides_data}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Slides data file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/presentations/{session_id}/slide/{slide_number}", response_class=HTMLResponse)
async def get_slide_html(session_id: str, slide_number: int):
    try:
        html_file_path = f"presentations/{session_id}/slides/slide{slide_number}.html"
        if not os.path.exists(html_file_path):
            raise HTTPException(status_code=404, detail="Slide not found")
        with open(html_file_path, 'r', encoding='utf-8') as file:
            html_content = file.read()
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/presentations/{session_id}/audio/{slide_number}")
async def get_audio(session_id: int, slide_number: int):
    def generate():
        with open(f"presentations/{session_id}/audios/audio{slide_number}.mp3", "rb") as audio_file:
            yield from audio_file
    return StreamingResponse(
        generate(),
        media_type="audio/mpeg",  # Corrected media type
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600"
        }
    )

@router.post("/api/presentations/{session_id}/generate")
async def generate_course(session_id: int, payload: CourseRequest):
    try:
        response = await generate_content(session_id, payload)
        return {"message": "Content generation started successfully", "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))