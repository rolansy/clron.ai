import os
import base64
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Create a directory to store uploaded images locally
UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

def upload_image(user_id, image_data, image_type):
    """
    Mock version of upload_image that saves files locally instead of Firebase Storage
    
    Args:
        user_id: User ID
        image_data: Binary image data
        image_type: MIME type of the image
        
    Returns:
        Local URL to the saved image
    """
    try:
        # Create user directory if it doesn't exist
        user_dir = UPLOADS_DIR / user_id
        user_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = image_type.split('/')[-1]
        filename = f"{timestamp}.{file_extension}"
        
        # Save the file
        file_path = user_dir / filename
        with open(file_path, 'wb') as f:
            f.write(image_data)
        
        # Return a local URL
        return f"/uploads/{user_id}/{filename}"
    except Exception as e:
        logger.error(f"Error in mock upload_image: {str(e)}")
        return None