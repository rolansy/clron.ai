from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import logging
import os
from pathlib import Path

from app.routers import chat

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

logger.info(f"ANTHROPIC_API_KEY set: {bool(os.environ.get('ANTHROPIC_API_KEY'))}")
logger.info(f"FIREBASE_STORAGE_BUCKET set: {bool(os.environ.get('FIREBASE_STORAGE_BUCKET'))}")
logger.info(f"FIREBASE_CREDENTIALS_PATH set: {bool(os.environ.get('FIREBASE_CREDENTIALS_PATH'))}")

# Initialize FastAPI app
app = FastAPI(
    title="AI Chatbot API",
    description="API for AI chatbot using Claude and Firebase",
    version="1.0.0",
)

# Configure CORS - Fix to allow Firebase hosting domains
origins = [
    "https://clron-2.web.app",
    "https://clron-2.firebaseapp.com",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Add this line to expose headers
)

# Include routers
app.include_router(chat.router)

# Set up static file serving for uploaded images
uploads_dir = Path(__file__).parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)