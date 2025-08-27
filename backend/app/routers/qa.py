from fastapi import WebSocket, WebSocketDisconnect, APIRouter, UploadFile, Form
import json
import logging
from app.services.qa_service import QAService

qa_service = QAService()
logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await qa_service.manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received message from {websocket.client}: {data}")
            message = json.loads(data)

            if message.get("type") == "auth":
                token = message.get("token", "")
                await qa_service.handle_auth(websocket, token)
                continue

            if websocket not in qa_service.authenticated:
                await qa_service.manager.send_response(websocket, {
                    "type": "error",
                    "message": "Authentication required"
                })
                continue

            if message.get("type") == "text_question":
                question_text = message.get("question", "")
                await qa_service.process_question(websocket, question_text)
            elif message.get("type") == "voice_question":
                audio_data_b64 = message.get("audio_data", "")
                await qa_service.handle_voice_question(websocket, audio_data_b64)
            else:
                await qa_service.manager.send_response(websocket, {
                    "type": "error",
                    "message": "Invalid message type"
                })
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {websocket.client}")
        qa_service.manager.disconnect(websocket)
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON from {websocket.client}: {data}")
        await qa_service.manager.send_response(websocket, {
            "type": "error",
            "message": "Invalid JSON format"
        })
    except Exception as e:
        logger.error(f"WebSocket error from {websocket.client}: {e}")
        await qa_service.manager.send_response(websocket, {
            "type": "error",
            "message": f"Server error: {str(e)}"
        })

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile, course_id: str = Form(None)):
    result = await qa_service.transcribe_audio(audio, course_id)
    return result