from fastapi import HTTPException, Depends, Header
import json
from pathlib import Path
import subprocess
import edge_tts
import os
import httpx
from selenium import webdriver
from PIL import Image
import time
from app.schemas.courseRequest import CourseRequest
from uuid import UUID
import logging

API_KEY = os.getenv("API_KEY")

logger = logging.getLogger(__name__)

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        logger.error("Invalid or missing API key")
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    logger.debug("API key validated successfully")

async def send_content(payload: CourseRequest, ai_request_id: UUID, model_api_host: str = "localhost", x_api_key: str = Depends(verify_api_key)):
    logger.info(f"Initiating content generation with payload: {payload}")
    async with httpx.AsyncClient() as client:
        logger.info(f"Sending request to model API for ai_request_id: {ai_request_id}")
        model_response = await client.post(
            f"http://{model_api_host}:8001/generate/{ai_request_id}",
            json=payload.dict()
        )
        logger.info(f"Model API response status: {model_response.status_code}")
        if model_response.status_code != 200:
            raise Exception(f"Model API failed: {model_response.text}")
        response_data = model_response.json()
        logger.info(f"Model API response: {response_data}")
        return response_data

async def generate_content(ai_request_id: UUID, language: str, response: dict):
    logger.info(f"Generating content for ai_request_id: {ai_request_id}")
    course_path = Path(f"presentations/{ai_request_id}")
    course_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"Created directory: {course_path}")

    logger.info(f"Received model response: {response}")

    logger.info("Generating slides...")
    slides = await generate_slides(response.get('slides', []), str(course_path / "slides"))
    logger.info(f"Generated slides: {slides}")

    logger.info("Creating audio...")
    audio_files = await create_audio(response.get('speech', []), language, str(course_path / "audios"))
    logger.info(f"Created audio files: {audio_files}")

    count = count_slides(slides)

    logger.info("Generating video...")
    video_path = generate_video(count, ai_request_id)
    logger.info(f"Video generated: {video_path}")

    return {
        "slides": slides,
        "audio_files": audio_files,
        "video": video_path
    }

async def check_and_generate_video(ai_request_id: UUID, language: str, response: dict, spring_boot_host: str = "localhost", x_api_key: str = Depends(verify_api_key)):
    video_path = f"presentations/{ai_request_id}/{ai_request_id}.mp4"
    if os.path.exists(video_path):
        logger.info(f"Video already exists for ai_request_id: {ai_request_id} at {video_path}")
    else:
        logger.info(f"No existing video found for ai_request_id: {ai_request_id}, generating...")
        await generate_content(ai_request_id, language, response)

    async with httpx.AsyncClient() as client:
        logger.info(f"Sending video to Spring Boot for ai_request_id: {ai_request_id}")
        with open(video_path, 'rb') as video_file:
            files = {'video': (f"{ai_request_id}.mp4", video_file, 'video/mp4')}
            metadata = {
                "language": language,
                "topic": response.get("topic", "Default Topic"),
                "level": response.get("level", "beginner"),
                "axes": response.get("axes", ["introduction", "examples"])
            }
            response = await client.post(
                f"http://{spring_boot_host}:8081/soft-skills/ai-resources/store/{ai_request_id}",
                files=files,
                data={'courseRequest': json.dumps(metadata)},
                headers={"X-API-Key": API_KEY}
            )
            logger.info(f"Spring Boot response status: {response.status_code}")
            if response.status_code != 200:
                logger.error(f"Failed to send video to Spring Boot: {response.text}")
                raise Exception(f"Failed to send video to Spring Boot: {response.text}")
            logger.info(f"Spring Boot notified successfully: {response.json()}")
    return {"video": video_path}

async def create_audio(speech, language: str, path: str):
    logger.info(f"Creating audio with language: {language}, path: {path}")
    os.makedirs(path, exist_ok=True)
    logger.info(f"Created audio directory: {path}")
    if isinstance(speech, str):
        logger.info("Speech is string, parsing JSON")
        speech_data = json.loads(speech)
    else:
        logger.info("Speech is object")
        speech_data = speech
    logger.info(f"Speech data: {speech_data}")

    generated_files = []

    for slide in speech_data:
        slide_id = slide.get("id")
        script = slide.get("script")
        code_explanation = slide.get("code_explanation")
        script = script + "\n" + code_explanation if code_explanation and code_explanation != "Explication indisponible" else script

        if not script or script == "Explication indisponible":
            continue

        file_name = f"audio{slide_id}.mp3"
        file_path = os.path.join(path, file_name)

        voice = "en-US-AriaNeural"
        if language == "fr":
            voice = "fr-FR-DeniseNeural"
        elif language == "es":
            voice = "es-ES-ElviraNeural"
        elif language == "it":
            voice = "it-IT-ElsaNeural"

        logger.info(f"Generating audio for slide {slide_id} with voice {voice}")
        await generate_audio(
            speech_text=script,
            file_name=file_name,
            file_path=path,
            voice=voice
        )
        logger.info(f"Audio generated for slide {slide_id}")

        generated_files.append({
            "slide_id": slide_id,
            "audio_file": file_path
        })

    return generated_files

async def generate_audio(speech_text: str, file_name: str, file_path: str, voice: str = "en-US-AriaNeural"):
    os.makedirs(file_path, exist_ok=True)
    full_path = os.path.join(file_path, file_name)
    communicate = edge_tts.Communicate(speech_text, voice)
    await communicate.save(full_path)
    return full_path

async def generate_slides(slides, path: str):
    logger.info(f"Starting generate_slides with slides: {slides} and path: {path}")
    output_dir = Path(path)
    output_dir.mkdir(exist_ok=True)
    logger.info(f"Created output directory: {output_dir}")

    generated_files = []

    for slide in slides:
        logger.info(f"Processing slide: {slide}")
        slide_id = slide.get("id")
        if slide_id is None:
            logger.warning(f"Skipping slide without ID: {slide}")
            continue

        logger.info(f"Generating HTML for slide ID {slide_id}")
        html_content = generate_html_slide(slide)
        logger.info(f"HTML content generated with length: {len(html_content)}")

        filename = f"slide{slide_id}.html"
        filepath = output_dir / filename
        logger.info(f"Writing to file: {filepath}")

        with open(filepath, 'w', encoding='utf-8') as html_file:
            html_file.write(html_content)
        logger.info(f"File written successfully: {filepath}")

        generated_files.append({
            "slide_id": slide_id,
            "html_file": str(filepath)
        })

    logger.info(f"Returning {len(generated_files)} generated files")
    return generated_files

def count_slides(slides):
    return len(slides)

def generate_html_slide(slide_data):
    html_template = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{slide_data.get('title', f"Slide {slide_data['id']}")}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: white; 
            min-height: 100vh; 
            padding: 20px; 
        }}
        .container {{ 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border: 2px solid #0066CC; 
            border-radius: 8px; 
        }}
        .header {{ 
            background: #0066CC; 
            color: white; 
            padding: 20px 30px; 
            position: relative; 
        }}
        .slide-number {{ 
            position: absolute; 
            top: 20px; 
            right: 30px; 
            background: rgba(255, 255, 255, 0.2); 
            padding: 5px 10px; 
            border-radius: 4px; 
            font-size: 14px; 
        }}
        .title {{ 
            font-size: 1.8em; 
            font-weight: 600; 
            margin-bottom: 10px; 
        }}
        .content {{ 
            padding: 30px; 
        }}
        .summary {{ 
            background: #f8f9fa; 
            border: 1px solid #e9ecef; 
            border-left: 4px solid #0066CC; 
            padding: 20px; 
            margin-bottom: 30px; 
            border-radius: 4px; 
        }}
        .summary h2 {{ 
            color: #0066CC; 
            font-size: 1.2em; 
            margin-bottom: 15px; 
            font-weight: 600; 
        }}
        .summary ul {{ 
            list-style: none; 
            padding-left: 0; 
        }}
        .summary li {{ 
            margin: 10px 0; 
            padding: 8px 0; 
            border-bottom: 1px solid #e9ecef; 
            padding-left: 15px; 
            position: relative; 
        }}
        .summary li::before {{ 
            content: "•"; 
            position: absolute; 
            left: 0; 
            color: #0066CC; 
            font-weight: bold; 
        }}
        .summary li:last-child {{ 
            border-bottom: none; 
        }}
        .summary strong {{ 
            color: #333; 
            font-weight: 600; 
        }}
        .code-section {{ 
            border: 1px solid #e9ecef; 
            border-radius: 4px; 
            overflow: hidden; 
            margin-top: 20px; 
        }}
        .code-header {{ 
            background: #0066CC; 
            color: white; 
            padding: 10px 20px; 
            font-weight: 500; 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
        }}
        .code-lang {{ 
            background: rgba(255, 255, 255, 0.2); 
            padding: 3px 8px; 
            border-radius: 3px; 
            font-size: 0.9em; 
        }}
        .code-content {{ 
            background: white; 
            border-top: 1px solid #e9ecef; 
        }}
        .code-content pre {{ 
            margin: 0; 
            padding: 20px; 
            background: white; 
            color: #333; 
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
            font-size: 14px; 
            line-height: 1.5; 
            overflow-x: auto; 
            border: none; 
        }}
        .code-content pre code {{ 
            background: none; 
            padding: 0; 
            border-radius: 0; 
            color: #333; 
        }}
        .navigation {{ 
            background: #f8f9fa; 
            padding: 15px 30px; 
            border-top: 1px solid #e9ecef; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }}
        .nav-button {{ 
            background: #0066CC; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-weight: 500; 
            text-decoration: none; 
            display: inline-flex; 
            align-items: center; 
            gap: 5px; 
            transition: background-color 0.2s ease; 
        }}
        .nav-button:hover {{ 
            background: #0052A3; 
        }}
        .nav-button:disabled {{ 
            background: #ccc; 
            cursor: not-allowed; 
        }}
        .slide-indicator {{ 
            background: white; 
            border: 1px solid #e9ecef; 
            border-radius: 4px; 
            padding: 5px 12px; 
            color: #666; 
            font-size: 0.9em; 
        }}
        .unavailable {{ 
            color: #666; 
            font-style: italic; 
            text-align: center; 
            padding: 20px; 
            background: #f8f9fa; 
            border-radius: 4px; 
            border: 1px solid #e9ecef; 
        }}
        @media (max-width: 768px) {{ 
            .container {{ 
                margin: 10px; 
                border-radius: 4px; 
            }} 
            .header {{ 
                padding: 15px 20px; 
            }} 
            .title {{ 
                font-size: 1.5em; 
            }} 
            .content {{ 
                padding: 20px; 
            }} 
            .navigation {{ 
                padding: 15px 20px; 
                flex-direction: column; 
                gap: 10px; 
            }} 
            .nav-button {{ 
                width: 100%; 
                justify-content: center; 
            }} 
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="slide-number">Slide {slide_data['id']}</div>
        </div>
        <div class="content">
            <div class="summary">
                <h2>Résumé</h2>
                {slide_data.get('summary', 'Résumé indisponible')}
            </div>
            <div class="code-section">
                <div class="code-header">
                    <span>Code</span>
                </div>
                <div class="code-content">
                    {slide_data.get('example_code', '<pre><code>// Code indisponible</code></pre>')}
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""
    return html_template

def capture_slide(html_path: str, output_png: str):
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--disable-gpu')
    options.add_argument('--disable-software-rasterizer')
    options.add_argument('--disable-background-timer-throttling')
    options.add_argument('--disable-renderer-backgrounding')
    options.add_argument('--disable-backgrounding-occluded-windows')

    driver = None
    try:
        driver = webdriver.Chrome(options=options)
        abs_path = os.path.abspath(html_path)
        driver.get(f"file://{abs_path}")
        time.sleep(3)
        driver.set_window_size(1920, 1080)
        time.sleep(1)
        driver.save_screenshot(output_png)
        logger.info(f"Screenshot saved: {output_png}")
    except Exception as e:
        logger.error(f"Error capturing slide {html_path}: {e}")
        raise
    finally:
        if driver:
            driver.quit()

def create_video_from_image_audio(image: str, audio: str, output: str):
    try:
        cmd = [
            'ffmpeg', '-y', '-loop', '1', '-i', image, '-i', audio,
            '-c:v', 'libx264', '-tune', 'stillimage', '-c:a', 'aac', '-b:a', '128k',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-pix_fmt', 'yuv420p', '-shortest', output
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f"Video created: {output}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Error creating video {output}: {e}")
        logger.error(f"FFmpeg stderr: {e.stderr}")
        raise

def concat_videos(video_list: list, output_file: str):
    try:
        output_dir = os.path.dirname(output_file)
        videos_txt = os.path.join(output_dir, 'videos.txt')
        with open(videos_txt, 'w') as f:
            for video in video_list:
                abs_video_path = os.path.abspath(video)
                f.write(f"file '{abs_video_path}'\n")
        cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', videos_txt, '-c', 'copy', output_file]
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f"Final video created: {output_file}")
        os.remove(videos_txt)
    except subprocess.CalledProcessError as e:
        logger.error(f"Error concatenating videos: {e}")
        logger.error(f"FFmpeg stderr: {e.stderr}")
        raise

def generate_video(nbr_slides, ai_request_id: UUID):
    slides_dir = f'presentations/{ai_request_id}/slides'
    audio_dir = f'presentations/{ai_request_id}/audios'
    output_dir = f'presentations/{ai_request_id}'

    if not os.path.exists(slides_dir):
        raise FileNotFoundError(f"Slides directory not found: {slides_dir}")
    if not os.path.exists(audio_dir):
        raise FileNotFoundError(f"Audio directory not found: {audio_dir}")

    videos = []
    try:
        for i in range(1, int(nbr_slides) + 1):
            html = f"{slides_dir}/slide{i}.html"
            image = f"{output_dir}/slide{i}.png"
            audio = f"{audio_dir}/audio{i}.mp3"
            video = f"{output_dir}/slide{i}.mp4"

            if not os.path.exists(html):
                logger.warning(f"HTML file not found: {html}")
                continue
            if not os.path.exists(audio):
                logger.warning(f"Audio file not found: {audio}")
                continue

            logger.info(f"Processing slide {i}...")
            capture_slide(html, image)
            create_video_from_image_audio(image, audio, video)
            videos.append(video)
            if os.path.exists(image):
                os.remove(image)

        if not videos:
            raise ValueError("No videos were generated")

        final_video = f"{output_dir}/{ai_request_id}.mp4"
        concat_videos(videos, final_video)
        for v in videos:
            if os.path.exists(v):
                os.remove(v)

        logger.info(f"Course video generated successfully: {final_video}")
        return final_video
    except Exception as e:
        for v in videos:
            if os.path.exists(v):
                os.remove(v)
        raise e

async def transfer_video(ai_request_id: UUID, spring_boot_host: str = "localhost", x_api_key: str = Depends(verify_api_key)) -> dict:
    try:
        video_path = f"presentations/{ai_request_id}/{ai_request_id}.mp4"
        if not os.path.exists(video_path):
            logger.error(f"Video file not found at {video_path}")
            raise HTTPException(status_code=404, detail=f"Video file not found at {video_path}")

        async with httpx.AsyncClient() as client:
            logger.info(f"Sending video to Spring Boot for ai_request_id: {ai_request_id}")
            with open(video_path, 'rb') as video_file:
                files = {'video': (f"{ai_request_id}.mp4", video_file, 'video/mp4')}
                response = await client.post(
                    f"http://{spring_boot_host}:8081/soft-skills/ai-resources/store/{ai_request_id}",
                    files=files,
                    headers={"X-API-Key": API_KEY}
                )
                logger.info(f"Spring Boot response status: {response.status_code}")
                if response.status_code != 200:
                    logger.error(f"Failed to send video to Spring Boot: {response.text}")
                    raise HTTPException(status_code=response.status_code, detail=f"Failed to send video to Spring Boot: {response.text}")
                logger.info(f"Spring Boot notified successfully: {response.json()}")
        return {"message": "Video transferred successfully", "spring_boot_response": response.json(), "ai_request_id": str(ai_request_id)}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error transferring video for ai_request_id {ai_request_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error transferring video: {str(e)}")