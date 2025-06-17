from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    content: str
    role: str = "user"
    image_data: Optional[str] = None
    image_type: Optional[str] = None
    chat_id: Optional[str] = None
    user_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    image_data: Optional[str] = None
    image_type: Optional[str] = None
    chat_id: Optional[str] = None
    system_prompt: Optional[str] = None

class ChatResponse(BaseModel):
    content: str
    chat_id: Optional[str] = None
    image_url: Optional[str] = None
    error: Optional[str] = None