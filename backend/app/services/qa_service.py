import json
import subprocess
import tempfile
import google.generativeai as genai
import os
import base64
import whisperx
import logging
import asyncio

from dotenv import load_dotenv
from app.models.course import Course
from fastapi import WebSocket

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket):
        await websocket.accept()
        logger.info(f"New connection accepted: {websocket.client}")
        self.active_connections.append(websocket)

    def disconnect(self, websocket):
        logger.info(f"Connection closed: {websocket.client}")
        self.active_connections.remove(websocket)

    async def send_response(self, websocket, data: dict):
        logger.info(f"Sending response to {websocket.client}: {data}")
        await websocket.send_text(json.dumps(data))


class SpeechToTextService:
    def __init__(self, model_size="small"):
        self.model = whisperx.load_model(model_size, device="cpu", compute_type="float32")
        logging.info(f"WhisperX model '{model_size}' loaded successfully")

    async def transcribe_audio(self, audio_data: bytes) -> str:
        try:
            # Save incoming audio as WebM
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_input:
                temp_input.write(audio_data)
                temp_input_path = temp_input.name

            # Convert WebM to WAV using FFmpeg
            temp_output_path = temp_input_path.replace(".webm", ".wav")
            ffmpeg_command = [
                "ffmpeg",
                "-i", temp_input_path,
                "-ar", "16000",
                "-ac", "1",
                "-y",
                temp_output_path
            ]
            process = subprocess.run(
                ffmpeg_command,
                check=True,
                capture_output=True,
                text=True
            )
            logging.info(f"FFmpeg conversion output: {process.stdout}")

            # Transcribe the WAV file
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.model.transcribe(temp_output_path, language="en")
            )

            # Clean up temporary files
            os.remove(temp_input_path)
            os.remove(temp_output_path)

            # Log the full result for debugging
            logging.info(f"WhisperX result: {result}")

            # Check if 'segments' exists (WhisperX typically returns 'segments' and 'language')
            if "segments" in result and result["segments"]:
                # Combine text from all segments
                transcribed_text = " ".join(segment["text"] for segment in result["segments"]).strip()
                return transcribed_text if transcribed_text else None
            else:
                logging.error("No segments found in transcription result")
                return None

        except subprocess.CalledProcessError as e:
            logging.error(f"FFmpeg conversion error: {e.stderr}")
            return None
        except Exception as e:
            logging.error(f"WhisperX transcription error: {str(e)}")
            return None


class QAService:
    def __init__(self):
        self.manager = ConnectionManager()
        self.speech_service = SpeechToTextService()
        api_key = os.getenv("GOOGLE_API_KEY")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.authenticated = {}  # Store authenticated WebSocket connections

    async def process_question(self, websocket, question_text: str, course_id: str = None):
        try:
            logger.info(f"Processing question: {question_text} for course_id: {course_id}")
            if not question_text or not question_text.strip():
                await self.manager.send_response(websocket, {
                    "type": "error",
                    "message": "Question cannot be empty"
                })
                return

            context = f"Context: Course ID {course_id} if applicable. " if course_id else ""
            response = self.model.generate_content(f"{context}{question_text}")
            text_response = response.text

            await self.manager.send_response(websocket, {
                "type": "text_response",
                "text": text_response,
            })

        except Exception as e:
            logger.error(f"Error processing question: {e}")
            await self.manager.send_response(websocket, {
                "type": "error",
                "message": f"Error processing question: {str(e)}"
            })

    async def handle_voice_question(self, websocket, audio_data_b64: str):
        try:
            logger.info(f"Handling voice question with chatbot data length: {len(audio_data_b64)}")
            audio_data = base64.b64decode(audio_data_b64)
            await self.manager.send_response(websocket, {
                "type": "transcribing",
                "status": "transcribing_audio"
            })
            transcribed_text = await self.speech_service.transcribe_audio(audio_data)
            if not transcribed_text:
                await self.manager.send_response(websocket, {
                    "type": "error",
                    "message": "Failed to transcribe chatbot"
                })
                return

            await self.manager.send_response(websocket, {
                "type": "transcription_ready",
                "transcribed_text": transcribed_text,
                "status": "processing_response"
            })
            await self.process_question(websocket, transcribed_text)
        except Exception as e:
            logger.error(f"Voice processing error: {e}")
            await self.manager.send_response(websocket, {
                "type": "error",
                "message": f"Voice processing error: {str(e)}"
            })

    async def handle_auth(self, websocket, token: str):
        logger.info(f"Auth attempt from {websocket.client} with token: {token[:10]}...")
        if token:  # Replace with actual validation logic
            self.authenticated[websocket] = True
            await self.manager.send_response(websocket, {
                "type": "auth_success"
            })
        else:
            await self.manager.send_response(websocket, {
                "type": "error",
                "message": "Authentication failed"
            })

    async def transcribe_audio(self, audio_file, course_id: str = None):
        try:
            audio_data = await audio_file.read()
            transcribed_text = await self.speech_service.transcribe_audio(audio_data)
            return {"transcribed_text": transcribed_text or "Transcription failed"}
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return {"transcribed_text": "Transcription failed"}