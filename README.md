# AI-Powered Learning Platform 

Welcome to the AI-Powered Learning Platform! This web app integrates a React frontend with a FastAPI backend, using PostgreSQL for data storage and FFmpeg for audio/video processing. It’s an online classroom where trainers create sessions with AI-generated slides and audio, learners access them based on group membership, and admins manage everything.
This README is a step-by-step guide to explain the app, set it up, and use it.


## Prerequisites

- Node.js: Version 20.19.2
- Python: Version 3.12.2 
- PostgreSQL: Version  17.4 
- FFmpeg: Version  N-120294-g25e710c61e-20250717
- Git: For cloning the repository
- npm: For managing React dependencies(10.2.5v)
- pip: For managing Python dependencies ( 24.0v )

## Installation 

### 1. Clone the Repository
```bash
git clone https://github.com/MonsefRH/E-learn.git
cd E-learn
```

### 2. Set Up PostgreSQL

* Access the PostgreSQL prompt
```bash
    psql -U postgres
```
* Create a database and user
```sql
    CREATE DATABASE elearning;
    CREATE USER admin WITH PASSWORD 'your_password';
    GRANT ALL PRIVILEGES ON DATABASE elearning TO admin;
```
* Access Database  
```bash
    psql -U admin -W elearning  
```
### 3.Install FFmpeg
Download from [FFmpeg official site](https://ffmpeg.org/download.html)
## Set Up the Application 

### Backend
```bash
    cd ./backend
    # Create/Activate a virtual environement
    python3 -m venv venv
    venv\Scripts\activate
```
```bash
    # Install dependencies 
    pip install -r requirements.txt 
```
```bash
    # Set up .env
    cp .env.example .env
    # Then customize the variables 
```
### Frontend 
```bash
    # Navigate to the frontend folder 
    cd ./frontend
    # Install the libraries
    npm start
```

## Key Features Overview

**Role-Based Access Control**: Admin privileges required for management endpoints (e.g., sessions, users, groups, courses, lessons).

**Real-Time Interaction**: WebSocket support for Q&A, enabling dynamic learner engagement.

**Content Delivery**: Streamed audio and HTML-based slide presentations for an interactive learning experience.

**User Customization**: Supports updating user profiles, passwords, and learner levels.

**Scalable Content Generation**: Asynchronous generation of slides, audio, and video content with integration to external services.

**Multimedia Support**: Leverages FFmpeg and edge_tts for high-quality video and audio production.

### Role-Specific Features

#### 1. Manager

* Category Management: Create, edit, and delete categories/subcategories with hierarchical organization.
* Course Management: Add, edit, delete, and activate courses with detailed metadata.
* Lesson Management: Create, edit, and delete lessons tied to courses.
* Session Management:Create , edit and delete the session (states: PENDING , VALIDATED, AVAILABLE)
    * PENDING : New session Created 
    * VALIDATED : Session validated by the responsable trainer 
    * AVAILABLE : Session Assigned by the admin to be avaible for the destinated group of learners 
* User Interface: Collapsible tree view for managing categories, courses, and lessons, with dialog-based forms and error handling.


### 2. Trainer

* Session Management: View and select pending sessions, and review validated sessions with presentation access.
* Content Preparation: Define session content (language, topic, level, axes), prepare materials (30-second simulated process), and validate for playback.
* Presentation Playback: Control slide navigation, audio playback (play/pause, skip, volume), and view progress.
* User Interface: Step-based workflow with progress bar, tabbed session views, and drag-and-drop axis reordering.

### 3. Learner

* Session Access: View and join available sessions by group, track enrolled sessions with progress, and see metrics like completed lessons.

* Presentation Tools: Navigate slides, control audio playback with progress bar, and use fullscreen mode with an animated avatar overlay.

* Chatbot Interaction: Submit typed or recorded audio questions, get real-time responses, and handle errors with notifications.

* Profile Overview: Edit username, email, and level, and view group membership and achievement milestones.

* UI and Accessibility: Use responsive cards, tabs, and animations, with loading/error states and

#  Live Tech Stack

##  Frontend

- React → Builds the UI  
- TypeScript → Type safety  
- React Router → Handles navigation  
- Tailwind CSS → Styling with utility classes  
- Shadcn/UI → Reusable UI components  
- Lucide Icons → Icons for UI  
- Dnd-kit → Drag-and-drop & sorting  




##  Backend

- FastAPI → API framework  
- SQLAlchemy → Database ORM  
- PostgreSQL / MySQL → Data storage  
- FFmpeg → Audio/Video processing for presentations  
- JWT → Authentication  
 

##  Dependency Versions

###  Frontend Dependencies


| Library                    | Version   | What It Does                                       |
|-----------------------------|-----------|---------------------------------------------------|
| react                      | ^18.3.1   | Builds the UI                                     |
| react-dom                  | ^18.3.1   | Renders React to the browser                      |
| typescript                 | ^5.5.3    | Type safety                                       |
| vite                       | ^5.4.1    | Frontend build tool                               |
| react-router-dom           | ^6.26.2   | Navigation / routing                              |
| tailwindcss                | ^3.4.11   | Styling                                           |
| tailwindcss-animate        | ^1.0.7    | Tailwind animation utilities                      |
| tailwind-merge             | ^2.5.2    | Merge Tailwind classes                            |
| @shadcn/ui                 | ^0.8.0    | UI components (built on Radix + Tailwind)         |
| lucide-react               | ^0.462.0  | Icon library                                      |
| @dnd-kit/core              | ^6.3.1    | Drag-and-drop core                                |
| @dnd-kit/sortable          | ^10.0.0   | Sorting support for drag-and-drop                 |
| @dnd-kit/modifiers         | ^9.0.0    | Drag-and-drop modifiers                           |
| @tanstack/react-query      | ^5.56.2   | Server state management / data fetching           |
| axios                      | ^1.10.0   | HTTP requests                                     |
| react-hook-form            | ^7.53.0   | Forms management                                  |
| @hookform/resolvers        | ^3.9.0    | Validation resolvers for react-hook-form          |
| zod                        | ^3.23.8   | Schema validation / form validation               |
| @mui/material              | ^7.2.0    | Material UI component library                     |
| @emotion/react             | ^11.14.0  | CSS-in-JS support for MUI                         |
| @emotion/styled            | ^11.14.1  | Styled components with Emotion                    |
| recharts                   | ^2.12.7   | Charting library                                  |
| embla-carousel-react       | ^8.3.0    | Carousel / slider component                       |
| react-day-picker           | ^8.10.1   | Date picker UI                                    |
| jwt-decode                 | ^4.0.0    | Decode JWT tokens                                 |
| next-themes                | ^0.3.0    | Theme (dark/light) switching                      |                       
| Radix UI Components (accordion, dialog, toast, etc.) | ^1.x–^2.x | Low-level accessible UI primitives used by @shadcn/ui |


---

###  Backend Dependencies

| Library                        | Version   | What It Does                                    |
|--------------------------------|-----------|------------------------------------------------|
| fastapi                        | 0.115.14  | Web API framework                               |
| uvicorn                        | 0.35.0    | ASGI server runner                              |
| SQLAlchemy                     | 2.0.41    | Database ORM                                    |
| alembic                        | 1.16.4    | Database migrations                             |
| psycopg2                       | 2.9.10    | PostgreSQL connector                            |
| mysql-connector-python         | 8.4.0     | MySQL connector                                 |
| python-jose                    | 3.5.0     | JWT authentication                              |
| python-multipart               | 0.0.20    | Form-data parsing (file uploads)                |
| requests                       | 2.32.4    | HTTP client                                     |
| httpx                          | 0.28.1    | Async HTTP client                               |
| websockets                     | 15.0.1    | WebSocket support                               |
| edge-tts                       | 7.0.2     | Text-to-Speech using Microsoft Edge             |
| faster-whisper / whisperx      | latest    | Speech recognition (Whisper models)             |
| huggingface-hub                | 0.33.4    | Hugging Face model hub integration              |
| transformers                   | 4.53.3    | NLP models (Hugging Face Transformers)          |
| torch                          | 2.7.1     | Deep learning framework                         |
| torchaudio                     | 2.7.1     | Audio processing with PyTorch                   |
| scikit-learn                   | 1.7.1     | Machine learning                                |
| pandas                         | 2.3.1     | Data analysis                                                          |
| pydantic                       | 2.11.7    | Data validation & parsing                       |
| starlette                      | 0.46.2    | ASGI toolkit (used by FastAPI)                  |
| pytest                         | 8.4.1     | Testing framework                               |

