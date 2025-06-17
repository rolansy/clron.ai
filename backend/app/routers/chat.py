from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
import logging
import base64
import json
import asyncio

from app.models.chat import ChatRequest, ChatResponse
from app.services import claude_service, firebase_service
from app.utils.image_utils import compress_image

router = APIRouter(prefix="/api", tags=["chat"])
logger = logging.getLogger(__name__)

async def get_user_id(authorization: Optional[str] = Header(None)):
    """Get user ID from Firebase token"""
    if not authorization:
        return "anonymous"  # Default for unauthenticated users
    
    try:
        # Format should be "Bearer <token>"
        if " " in authorization:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() == "bearer":
                decoded_token = firebase_service.verify_token(token)
                if decoded_token:
                    return decoded_token.get("uid")
        
        return "anonymous"
    except Exception as e:
        logger.error(f"Error getting user ID: {str(e)}")
        return "anonymous"

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_user_id)
):
    """Handle chat requests with text and optional image"""
    try:
        logger.info(f"Received chat request from user {user_id}")
        
        # First, check if Claude service is available
        if not claude_service.client:
            logger.error("Claude API client is not initialized")
            raise HTTPException(status_code=503, detail="Claude API service is unavailable")
        
        # Process the image if provided
        image_url = None
        image_data = None
        image_type = None
        
        if request.image_data:
            logger.info("Processing image data")
            
            try:
                # Compress image if needed
                image_data, image_type = compress_image(request.image_data)
                
                # Upload to Firebase Storage if authenticated
                if user_id != "anonymous":
                    image_url = firebase_service.upload_image(
                        user_id=user_id,
                        image_data=base64.b64decode(image_data),
                        image_type=image_type
                    )
                    logger.info(f"Image uploaded: {image_url}")
            except Exception as img_error:
                logger.error(f"Image processing error: {str(img_error)}")
                # Continue without the image rather than failing the request
        
        # Get chat history if this is a continuation
        chat_history = []
        if request.chat_id and user_id != "anonymous":
            try:
                chat_history = firebase_service.get_chat_history(user_id, request.chat_id)
                logger.info(f"Retrieved {len(chat_history)} messages from chat history")
            except Exception as hist_error:
                logger.error(f"Failed to get chat history: {str(hist_error)}")
                # Continue without history rather than failing
        
        # Call Claude API
        logger.info("Calling Claude API...")
        claude_response = claude_service.send_message(
            message=request.message,
            image_data=image_data,
            image_type=image_type,
            chat_history=chat_history,
            system_prompt=request.system_prompt
        )
        
        if "error" in claude_response:
            logger.error(f"Claude API error: {claude_response['error']}")
            raise HTTPException(status_code=500, detail=claude_response["error"])
        
        # Save messages to Firestore if authenticated
        chat_id = request.chat_id
        if user_id != "anonymous":
            try:
                # Save user message
                user_message = {
                    "content": request.message,
                    "role": "user",
                    "chat_id": chat_id,
                    "image_url": image_url
                }
                
                chat_id = firebase_service.save_chat_message(user_id, user_message)
                
                # Save assistant response
                assistant_message = {
                    "content": claude_response["content"],
                    "role": "assistant",
                    "chat_id": chat_id
                }
                
                firebase_service.save_chat_message(user_id, assistant_message)
                logger.info(f"Saved messages to Firestore with chat_id: {chat_id}")
            except Exception as save_error:
                logger.error(f"Failed to save messages: {str(save_error)}")
                # Continue rather than failing the request
        
        # Return response
        return ChatResponse(
            content=claude_response["content"],
            chat_id=chat_id,
            image_url=image_url
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/chat/upload", response_model=ChatResponse)
async def upload_image(
    image: UploadFile = File(...),
    message: str = Form(""),
    chat_id: Optional[str] = Form(None),
    system_prompt: Optional[str] = Form(None),
    user_id: str = Depends(get_user_id)
):
    """Handle chat requests with file upload"""
    try:
        logger.info(f"Received image upload from user {user_id}")
        
        # First, check if Claude service is available
        if not claude_service.client:
            logger.error("Claude API client is not initialized")
            raise HTTPException(status_code=503, detail="Claude API service is unavailable")
        
        # Read and process the uploaded image
        image_bytes = await image.read()
        image_type = image.content_type
        
        # Validate image
        if not image_type or not image_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Compress the image
        image_data_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Upload to Firebase Storage if authenticated
        image_url = None
        if user_id != "anonymous":
            try:
                image_url = firebase_service.upload_image(
                    user_id=user_id,
                    image_data=image_bytes,
                    image_type=image_type
                )
                logger.info(f"Image uploaded: {image_url}")
            except Exception as img_error:
                logger.error(f"Image processing error: {str(img_error)}")
                # Continue without storing the image
        
        # Get chat history if this is a continuation
        chat_history = []
        if chat_id and user_id != "anonymous":
            try:
                chat_history = firebase_service.get_chat_history(user_id, chat_id)
                logger.info(f"Retrieved {len(chat_history)} messages from chat history")
            except Exception as hist_error:
                logger.error(f"Failed to get chat history: {str(hist_error)}")
        
        # Call Claude API
        claude_response = claude_service.send_message(
            message=message,
            image_data=image_data_base64,
            image_type=image_type,
            chat_history=chat_history,
            system_prompt=system_prompt
        )
        
        if "error" in claude_response:
            logger.error(f"Claude API error: {claude_response['error']}")
            raise HTTPException(status_code=500, detail=claude_response["error"])
        
        # Save messages to Firestore if authenticated
        if user_id != "anonymous":
            try:
                # Save user message
                user_message = {
                    "content": message,
                    "role": "user",
                    "chat_id": chat_id,
                    "image_url": image_url
                }
                
                chat_id = firebase_service.save_chat_message(user_id, user_message)
                
                # Save assistant response
                assistant_message = {
                    "content": claude_response["content"],
                    "role": "assistant",
                    "chat_id": chat_id
                }
                
                firebase_service.save_chat_message(user_id, assistant_message)
                logger.info(f"Saved messages to Firestore with chat_id: {chat_id}")
            except Exception as save_error:
                logger.error(f"Failed to save messages: {str(save_error)}")
        
        # Return response
        return ChatResponse(
            content=claude_response["content"],
            chat_id=chat_id,
            image_url=image_url
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/chats")
async def get_chats(user_id: str = Depends(get_user_id)):
    """Get list of user's chats"""
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    chats = firebase_service.get_chat_history(user_id)
    return {"chats": chats}

@router.get("/chats/{chat_id}")
async def get_chat(chat_id: str, user_id: str = Depends(get_user_id)):
    """Get messages from a specific chat"""
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    
    messages = firebase_service.get_chat_history(user_id, chat_id)
    return {"messages": messages}

@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    user_id: str = Depends(get_user_id)
):
    """Handle streaming chat requests with text and optional image"""
    try:
        logger.info(f"Received streaming chat request from user {user_id}")
        
        # First, check if Claude service is available
        if not claude_service.client:
            logger.error("Claude API client is not initialized")
            raise HTTPException(status_code=503, detail="Claude API service is unavailable")
        
        # Process the image if provided
        image_url = None
        image_data = None
        image_type = None
        
        if request.image_data:
            logger.info("Processing image data")
            try:
                # Compress image if needed
                image_data, image_type = compress_image(request.image_data)
                
                # Upload to Firebase Storage if authenticated
                if user_id != "anonymous":
                    image_url = firebase_service.upload_image(
                        user_id=user_id,
                        image_data=base64.b64decode(image_data),
                        image_type=image_type
                    )
                    logger.info(f"Image uploaded: {image_url}")
            except Exception as img_error:
                logger.error(f"Image processing error: {str(img_error)}")
        
        # Get chat history if this is a continuation
        chat_history = []
        if request.chat_id and user_id != "anonymous":
            try:
                chat_history = firebase_service.get_chat_history(user_id, request.chat_id)
                logger.info(f"Retrieved {len(chat_history)} messages from chat history")
            except Exception as hist_error:
                logger.error(f"Failed to get chat history: {str(hist_error)}")
        
        # Call Claude API with streaming
        async def stream_response():
            # First yield chat ID and image URL
            metadata = {
                "type": "metadata",
                "chat_id": request.chat_id,
                "image_url": image_url
            }
            yield f"data: {json.dumps(metadata)}\n\n"
            
            # Initialize accumulating message content
            accumulated_content = ""
            
            async for chunk in claude_service.stream_message(
                message=request.message,
                image_data=image_data,
                image_type=image_type,
                chat_history=chat_history,
                system_prompt=request.system_prompt
            ):
                # Send the chunk
                yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                accumulated_content += chunk
            
            # Save messages to Firestore if authenticated
            chat_id = request.chat_id
            if user_id != "anonymous":
                try:
                    # Save user message
                    user_message = {
                        "content": request.message,
                        "role": "user",
                        "chat_id": chat_id,
                        "image_url": image_url
                    }
                    
                    chat_id = firebase_service.save_chat_message(user_id, user_message)
                    
                    # Save assistant response
                    assistant_message = {
                        "content": accumulated_content,
                        "role": "assistant",
                        "chat_id": chat_id
                    }
                    
                    firebase_service.save_chat_message(user_id, assistant_message)
                    logger.info(f"Saved messages to Firestore with chat_id: {chat_id}")
                    
                    # Send the final chat ID
                    final_data = {
                        "type": "final",
                        "chat_id": chat_id,
                    }
                    yield f"data: {json.dumps(final_data)}\n\n"
                except Exception as save_error:
                    logger.error(f"Failed to save messages: {str(save_error)}")
            
            # End the stream
            yield "data: [DONE]\n\n"
            
        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat streaming endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")