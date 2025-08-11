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
        self.authenticated = {}  # Store authenticated WebSocket connections
        self.model_ws = None

    async def connect_to_model(self):
        import websockets
        try:
            # Configure WebSocket with longer ping interval and timeout
            self.model_ws = await websockets.connect(
                "ws://localhost:8001/ws",
                ping_interval=50,  # Increase ping interval (seconds)
                ping_timeout=300,  # Increase timeout to 5 minutes
                close_timeout=10   # Close timeout
            )
            logger.info("Successfully connected to model WebSocket")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to model WebSocket: {e}")
            return False

    async def ask_model(self, question: str) -> str:
        """Send a question to the model and get the response"""
        if not self.model_ws:
            if not await self.connect_to_model():
                return "Failed to connect to model service"

        try:
            # Start a background task to keep the connection alive
            heartbeat_task = asyncio.create_task(self._heartbeat())

            await self.model_ws.send(question)
            response = await self.model_ws.recv()

            # Cancel the heartbeat task once we get a response
            heartbeat_task.cancel()
            return response
        except Exception as e:
            logger.error(f"Error communicating with model: {e}")
            # Try to reconnect once
            if await self.connect_to_model():
                try:
                    await self.model_ws.send(question)
                    response = await self.model_ws.recv()
                    return response
                except Exception as e2:
                    logger.error(f"Error after reconnection: {e2}")
            return f"Error communicating with model: {str(e)}"

    async def _heartbeat(self):
        """Send periodic pings to keep the connection alive during long model inferences"""
        try:
            while True:
                if self.model_ws and self.model_ws.open:
                    logger.debug("Sending heartbeat ping to model service")
                    pong_waiter = await self.model_ws.ping()
                    await asyncio.wait_for(pong_waiter, timeout=10)
                await asyncio.sleep(30)  # Send ping every 30 seconds
        except asyncio.CancelledError:
            # Task was cancelled, which is expected when we're done
            pass
        except Exception as e:
            logger.warning(f"Heartbeat error: {e}")

    async def process_question(self, websocket, question_text: str):
        try:
            if not question_text or not question_text.strip():
                await self.manager.send_response(websocket, {
                    "type": "error",
                    "message": "Question cannot be empty"
                })
                return

            text_response = await self.ask_model(f"{question_text}")

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
            logger.info(f"Handling voice question with audio data length: {len(audio_data_b64)}")
            audio_data = base64.b64decode(audio_data_b64)
            await self.manager.send_response(websocket, {
                "type": "transcribing",
                "status": "transcribing_audio"
            })
            transcribed_text = await self.speech_service.transcribe_audio(audio_data)
            if not transcribed_text:
                await self.manager.send_response(websocket, {
                    "type": "error",
                    "message": "Failed to transcribe audio"
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