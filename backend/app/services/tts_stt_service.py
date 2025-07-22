import edge_tts

import os

import whisper
import tempfile
import asyncio
import logging

logger = logging.getLogger(__name__)

async def generate_audio(speech_text: str, file_name: str, file_path: str, voice: str = "en-US-AriaNeural"):
    os.makedirs(file_path, exist_ok=True)

    full_path = os.path.join(file_path, file_name)

    communicate = edge_tts.Communicate(speech_text, voice)

    await communicate.save(full_path)

    return full_path

async def transcribe_audio(audio_data: bytes) -> str:
    try:
        model = whisper.load_model("base")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: model.transcribe(temp_file_path)
            )
            if "text" in result:
                return result["text"].strip()
            return None
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    except Exception as e:
        logger.error(f"Speech-to-Text Error: {e}")
        return None


