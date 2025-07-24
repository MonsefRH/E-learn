import json
import os
from pathlib import Path

import httpx

from app.services.tts_stt_service import generate_audio
from app.schemas.courseRequest import CourseRequest


async def receive_content(payload: CourseRequest):
    print(f"Receiving content with payload: {payload}")
    async with httpx.AsyncClient() as client:
        print("Sending request to upload/generate endpoint")
        # TODO: Replace with actual remote API call when accessible
        response = await client.post("http://localhost:8000/upload/generate", json=payload.dict())
        print(f"Response status: {response.status_code}")
        return response.json()


async def generate_content(session_id, payload: CourseRequest):
    print(f"Generating content for session_id: {session_id}")
    session_path = Path(f"presentations/{session_id}")
    session_path.mkdir(parents=True, exist_ok=True)
    print(f"Created directory: {session_path}")

    print("Calling receive_content...")
    response = await receive_content(payload)
    print(f"Received content response: {response}")

    print("Generating slides...")
    slides = await generate_slides(response.get('slides', {}), str(session_path / "slides"))
    print(f"Generated slides: {slides}")

    print("Creating audio...")
    audio_files = await create_audio(response.get('speech', {}), payload.language, str(session_path / "audios"))
    print(f"Created audio files: {audio_files}")

    return {
        "slides": slides,
        "audio_files": audio_files
    }


async def create_audio(speech, language, path: str):
    print(f"Creating audio with language: {language}, path: {path}")
    os.makedirs(path, exist_ok=True)
    print(f"Created audio directory: {path}")
    if isinstance(speech, str):
        print("Speech is string, parsing JSON")
        speech_data = json.loads(speech)
    else:
        print("Speech is object")
        speech_data = speech
    print(f"Speech data: {speech_data}")

    generated_files = []

    for slide in speech_data:
        slide_id = slide.get("id")
        script = slide.get("script")
        code_explanation = slide.get("code_explanation")
        script = script + "\n" + code_explanation

        if not code_explanation or code_explanation == "Explication indisponible":
            script = slide.get("script")

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

        print(f"Generating audio for slide {slide_id} with voice {voice}")
        await generate_audio(
            speech_text=script,
            file_name=file_name,
            file_path=path,
            voice=voice
        )
        print(f"Audio generated for slide {slide_id}")

        generated_files.append({
            "slide_id": slide_id,
            "audio_file": file_path
        })

    return generated_files


async def generate_slides(slides, path: str):
    print(f"Starting generate_slides with slides: {slides} and path: {path}")

    output_dir = Path(path)
    output_dir.mkdir(exist_ok=True)
    print(f"Created output directory: {output_dir}")

    generated_files = []

    print(f"Processing slides: {slides}")
    for slide in slides:
        print(f"Processing slide: {slide}")
        slide_id = slide.get("id")
        if slide_id is None:
            print(f"Skipping slide without ID: {slide}")
            continue

        print(f"Generating HTML for slide ID {slide_id}")
        html_content = generate_html_slide(slide)
        print(f"HTML content generated with length: {len(html_content)}")

        filename = f"slide{slide_id}.html"
        filepath = output_dir / filename
        print(f"Writing to file: {filepath}")

        with open(filepath, 'w', encoding='utf-8') as html_file:
            html_file.write(html_content)
        print(f"File written successfully: {filepath}")

        generated_files.append({
            "slide_id": slide_id,
            "html_file": str(filepath)
        })
        print(f"Added to generated_files, current count: {len(generated_files)}")

    print(f"Returning {len(generated_files)} generated files")
    return generated_files


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
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            animation: slideIn 0.6s ease-out;
        }}

        @keyframes slideIn {{
            from {{
                opacity: 0;
                transform: translateY(30px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}

        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }}

        .header::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
            opacity: 0.3;
        }}

        .slide-number {{
            position: absolute;
            top: 20px;
            right: 30px;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }}

        .title {{
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }}


        .content {{
            padding: 40px;
        }}

        .summary {{
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-left: 5px solid #3498db;
            padding: 25px;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }}

        .summary h2 {{
            color: #2c3e50;
            font-size: 1.4em;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }}

        .summary h2::before {{
            content: "📚";
            margin-right: 10px;
            font-size: 1.2em;
        }}

        .summary ul {{
            list-style: none;
            padding-left: 0;
        }}

        .summary li {{
            margin: 15px 0;
            padding: 12px 0;
            border-bottom: 1px solid #dee2e6;
            position: relative;
            padding-left: 25px;
        }}

        .summary li::before {{
            content: "▶";
            position: absolute;
            left: 0;
            color: #3498db;
            font-size: 0.8em;
        }}

        .summary li:last-child {{
            border-bottom: none;
        }}

        .summary strong {{
            color: #2c3e50;
            font-weight: 600;
        }}

        .code-section {{
            background: #1e1e1e;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            margin-top: 30px;
        }}

        .code-header {{
            background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
            color: white;
            padding: 15px 25px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .code-header::before {{
            content: "☕";
            margin-right: 10px;
            font-size: 1.2em;
        }}

        .code-lang {{
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.9em;
        }}

        .code-content {{
            padding: 0;
        }}

        .code-content pre {{
            margin: 0;
            padding: 25px;
            background: #1e1e1e;
            color: #f8f8f2;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            overflow-x: auto;
        }}

        .code-content pre code {{
            background: none;
            padding: 0;
            border-radius: 0;
        }}

        .navigation {{
            background: #f8f9fa;
            padding: 20px 40px;
            border-top: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .nav-button {{
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }}

        .nav-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
        }}

        .nav-button:disabled {{
            background: #bdc3c7;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }}

        .slide-indicator {{
            background: #e9ecef;
            border-radius: 15px;
            padding: 8px 16px;
            color: #6c757d;
            font-size: 0.9em;
            font-weight: 500;
        }}

        .unavailable {{
            color: #e74c3c;
            font-style: italic;
            text-align: center;
            padding: 20px;
            background: #fdf2f2;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
        }}

        @media (max-width: 768px) {{
            .container {{
                margin: 10px;
                border-radius: 10px;
            }}

            .header {{
                padding: 20px;
            }}

            .title {{
                font-size: 2em;
            }}

            .content {{
                padding: 20px;
            }}

            .navigation {{
                padding: 15px 20px;
                flex-direction: column;
                gap: 15px;
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
                    <span>Code Java</span>
                    <span class="code-lang">Java</span>
                </div>
                <div class="code-content">
                    {slide_data.get('example_code', '<pre><code>// Code indisponible</code></pre>')}
                </div>
            </div>
        </div>
    </div>
</body>
</html>"""
    return html_template