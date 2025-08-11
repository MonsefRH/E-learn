from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from app.schemas.courseRequest import CourseRequest
from app.services.content_service import send_content, check_and_generate_video, transfer_video
import os
import json
import httpx
import logging
from uuid import UUID

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["slides"])

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
async def get_audio(session_id: str, slide_number: int):
    def generate():
        with open(f"presentations/{session_id}/audios/audio{slide_number}.mp3", "rb") as audio_file:
            yield from audio_file
    return StreamingResponse(
        generate(),
        media_type="audio/mpeg",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600"
        }
    )

@router.post("/api/presentations/{ai_request_id}/generate/start")
async def send_to_model(ai_request_id: UUID, payload: CourseRequest, model_api_host: str = "localhost"):
    try:
        logger.info(f"Initiating video generation for ai_request_id: {ai_request_id}")
        response = await send_content(payload, ai_request_id, model_api_host)
        return {"message": "Video generation initiated successfully", "ai_request_id": str(ai_request_id), "response": response}
    except Exception as e:
        logger.error(f"Error initiating video generation for ai_request_id {ai_request_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error initiating video generation: {str(e)}")

@router.post("/api/presentations/{ai_request_id}/generate/process")
async def process_content(ai_request_id: UUID, payload: CourseRequest, response: dict, spring_boot_host: str = "localhost"):
    try:
        result = await check_and_generate_video(ai_request_id, payload.language, response, spring_boot_host)
        return {"message": "Video processed and sent to Spring Boot successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/presentations/{ai_request_id}/test-transfer")
async def test_video_transfer(ai_request_id: UUID, spring_boot_host: str = "localhost"):
    return await transfer_video(ai_request_id, spring_boot_host)