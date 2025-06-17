import os
import json
import logging
import time  
import firebase_admin
from firebase_admin import credentials, firestore, auth
from pathlib import Path

# Import the mock storage implementation
from app.services.mock_storage import upload_image as mock_upload_image

logger = logging.getLogger(__name__)

# Set to True to use local storage instead of Firebase Storage
USE_MOCK_STORAGE = True

# Initialize Firebase Admin SDK
try:
    cred = None
    # First try to get credentials from environment variable
    if os.environ.get("FIREBASE_CREDENTIALS"):
        try:
            cred_dict = json.loads(os.environ.get("FIREBASE_CREDENTIALS"))
            cred = credentials.Certificate(cred_dict)
            logger.info("Using Firebase credentials from environment variable")
        except json.JSONDecodeError:
            logger.error("Failed to parse FIREBASE_CREDENTIALS as JSON")
    
    # Then try to load from file path environment variable
    if not cred and os.environ.get("FIREBASE_CREDENTIALS_PATH"):
        cred_file = os.environ.get("FIREBASE_CREDENTIALS_PATH")
        if os.path.exists(cred_file):
            cred = credentials.Certificate(cred_file)
            logger.info(f"Using Firebase credentials from file: {cred_file}")
    
    # Then try to load from default location
    if not cred:
        cred_file = Path(__file__).parent.parent.parent / "firebase-credentials.json"
        if cred_file.exists():
            cred = credentials.Certificate(str(cred_file))
            logger.info(f"Using Firebase credentials from default file: {cred_file}")
    
    if cred:
        # Initialize without Storage bucket
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Firebase initialized successfully")
    else:
        logger.warning("Firebase credentials not found, initializing in mock mode")
        db = None
        
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {str(e)}")
    db = None

def verify_token(id_token):
    """Verify Firebase Auth token"""
    try:
        if not id_token:
            return None
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        return None

def save_chat_message(user_id, message_data):
    """Save a chat message to Firestore"""
    if not db:
        logger.warning("Firestore not initialized, skipping save_chat_message")
        return None
    
    try:
        # Add timestamp
        message_data["timestamp"] = firestore.SERVER_TIMESTAMP
        
        # Generate a chat ID if it's a new conversation
        chat_id = message_data.get("chat_id")
        if not chat_id:
            chat_id = f"chat_{int(time.time())}"
            message_data["chat_id"] = chat_id
        
        # Save to Firestore
        chat_ref = db.collection(f"users/{user_id}/chats").document(chat_id)
        messages_ref = chat_ref.collection("messages").document()
        
        # Add the message
        messages_ref.set(message_data)
        
        # Update the chat document with latest info
        chat_ref.set({
            "updated_at": firestore.SERVER_TIMESTAMP,
            "title": message_data.get("title", "New Chat"),
            "last_message": message_data.get("content", "")[:50] + "..."
        }, merge=True)
        
        return chat_id
    except Exception as e:
        logger.error(f"Error saving chat message: {str(e)}")
        return None

def upload_image(user_id, image_data, image_type):
    """Upload an image (uses mock implementation)"""
    logger.info("Using mock storage for image uploads")
    return mock_upload_image(user_id, image_data, image_type)

def get_chat_history(user_id, chat_id=None, limit=20):
    """Get chat history for a user"""
    if not db:
        logger.warning("Firestore not initialized, skipping get_chat_history")
        return []
    
    try:
        if chat_id:
            # Get messages for a specific chat
            messages = db.collection(f"users/{user_id}/chats/{chat_id}/messages") \
                .order_by("timestamp", direction=firestore.Query.ASCENDING) \
                .limit(limit) \
                .stream()
            return [msg.to_dict() for msg in messages]
        else:
            # Get list of chats
            chats = db.collection(f"users/{user_id}/chats") \
                .order_by("updated_at", direction=firestore.Query.DESCENDING) \
                .limit(limit) \
                .stream()
            return [chat.to_dict() for chat in chats]
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        return []