import os
import logging
import anthropic
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Initialize Anthropic client
try:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        client = None
    else:
        # Make sure this matches the installed anthropic package version
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
    
    Args:
        message: Text message from the user
        image_data: Base64 encoded image data (optional)
        image_type: MIME type of the image (optional)
        chat_history: Previous messages in the conversation (optional)
        system_prompt: System prompt to use (optional)
        
    Returns:
        Dictionary with Claude's response
    """
    if not client:
        logger.error("Anthropic client not initialized")
        return {"error": "Service unavailable"}
    
    try:
        # Create content array
        content = []
        
        # Add text message if provided
        if message:
            content.append({
                "type": "text",
                "text": message
            })
        
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
                role = "user" if msg.get("role") == "user" else "assistant"
                msg_content = []
                
                if msg.get("content"):
                    msg_content.append({
                        "type": "text",
                        "text": msg.get("content")
                    })
                    
                if role == "user" and msg.get("image_url"):
                    # For now, we don't re-include images from history
                    # as it would require downloading and re-encoding them
                    pass
                    
                if msg_content:
                    messages.append({
                        "role": role,
                        "content": msg_content
                    })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": content
        })
        
        # Default system prompt if none provided
        if not system_prompt:
            system_prompt = "You are a helpful, friendly AI assistant who adapts to the user's communication style. Be natural and engaging."
        
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
            "content": response.content[0].text,
            "message_id": response.id,
            "model": response.model,
            "role": "assistant"
        }
        
    except Exception as e:
        logger.error(f"Error calling Claude API: {str(e)}")
        return {"error": f"Failed to get response: {str(e)}"}