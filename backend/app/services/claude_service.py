import os
import logging
import anthropic
from typing import List, Dict, Any, Optional, AsyncGenerator

logger = logging.getLogger(__name__)

# Initialize Anthropic client
try:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        client = None
    else:
        # Simple initialization without any proxy parameters
        logger.info(f"Attempting to initialize Anthropic client with API key: {api_key[:8]}...")
        client = anthropic.Anthropic(api_key=api_key)
        logger.info("Anthropic client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Anthropic client: {str(e)}")
    client = None

def send_message(
    message: str, 
    image_data: Optional[str] = None, 
    image_type: Optional[str] = None,
    chat_history: Optional[List[Dict[str, Any]]] = None,
    system_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send a message to Claude API with optional image and chat history
    """
    if not client:
        logger.error("Anthropic client not initialized")
        return {"error": "Service unavailable"}
    
    try:
        # Create content array
        content = []
        
        # Add text message if provided
        if message:
            content.append({"type": "text", "text": message})
        
        # Add image if provided
        if image_data and image_type:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_type,
                    "data": image_data
                }
            })
        
        # Prepare messages array
        messages = []
        
        # Add chat history if provided
        if chat_history:
            for msg in chat_history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": content
        })
        
        # Default system prompt if none provided
        if not system_prompt:
            system_prompt = "You are Claude, a helpful AI assistant. Respond in a helpful, accurate, and engaging way."
        
        logger.info(f"Sending request to Claude API with {len(messages)} messages")
        
        # Make the request to Anthropic API
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            system=system_prompt,
            messages=messages,
            max_tokens=4096,
            temperature=0.7
        )
        
        # Process and return the response
        return {
            "content": response.content[0].text if response.content else "",
            "model": response.model,
            "id": response.id
        }
        
    except Exception as e:
        logger.error(f"Error in send_message: {str(e)}")
        return {"error": str(e)}

async def stream_message(
    message: str, 
    image_data: Optional[str] = None, 
    image_type: Optional[str] = None,
    chat_history: Optional[List[Dict[str, Any]]] = None,
    system_prompt: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Stream a message from Claude API with optional image and chat history
    """
    if not client:
        yield "Error: Claude service not available"
        return
    
    try:
        # Create content array
        content = []
        
        # Add text message if provided
        if message:
            content.append({"type": "text", "text": message})
        
        # Add image if provided
        if image_data and image_type:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_type,
                    "data": image_data
                }
            })
        
        # Prepare messages array
        messages = []
        
        # Add chat history if provided
        if chat_history:
            for msg in chat_history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": content
        })
        
        # Default system prompt if none provided
        if not system_prompt:
            system_prompt = "You are Claude, a helpful AI assistant. Respond in a helpful, accurate, and engaging way."
        
        logger.info(f"Streaming request to Claude API with {len(messages)} messages")
        
        # Make the streaming request to Anthropic API
        with client.messages.stream(
            model="claude-3-sonnet-20240229",
            system=system_prompt,
            messages=messages,
            max_tokens=4096,
            temperature=0.7
        ) as stream:
            for text in stream.text_stream:
                yield text
                
    except Exception as e:
        logger.error(f"Error in stream_message: {str(e)}")
        yield f"Error: {str(e)}"