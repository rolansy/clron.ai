import base64
from io import BytesIO
from PIL import Image
import logging

logger = logging.getLogger(__name__)

def compress_image(image_data: str, max_size_kb: int = 4096) -> tuple:
    """
    Compress image if it's larger than max_size_kb
    
    Args:
        image_data: Base64 encoded image data
        max_size_kb: Maximum size in KB (default 4MB)
        
    Returns:
        Tuple of (compressed_base64_data, mime_type)
    """
    try:
        # Split the base64 string to get the actual data
        header, encoded = image_data.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        
        # Decode base64
        binary_data = base64.b64decode(encoded)
        
        # Check size
        current_size_kb = len(binary_data) / 1024
        if current_size_kb <= max_size_kb:
            # No need to compress
            return encoded, mime_type
            
        # Open the image with PIL
        img = Image.open(BytesIO(binary_data))
        
        # Calculate current dimensions
        width, height = img.size
        
        # Try compression quality first for JPEG
        if mime_type in ["image/jpeg", "image/jpg"]:
            quality = 85  # Initial quality
            output = BytesIO()
            
            while quality > 30:  # Don't go below quality 30
                output = BytesIO()
                img.save(output, format="JPEG", quality=quality)
                if len(output.getvalue()) / 1024 <= max_size_kb:
                    break
                quality -= 10
                
            # If still too large, resize
            if len(output.getvalue()) / 1024 > max_size_kb:
                # Calculate new dimensions
                scale_factor = (max_size_kb / (len(output.getvalue()) / 1024)) ** 0.5
                new_width = int(width * scale_factor)
                new_height = int(height * scale_factor)
                
                # Resize and save
                img = img.resize((new_width, new_height), Image.LANCZOS)
                output = BytesIO()
                img.save(output, format="JPEG", quality=quality)
                
            # Return compressed data
            compressed_data = base64.b64encode(output.getvalue()).decode("utf-8")
            return compressed_data, "image/jpeg"
            
        # For PNG or other formats, try resizing
        else:
            # Calculate target size
            scale_factor = (max_size_kb / current_size_kb) ** 0.5
            if scale_factor >= 1:
                # No need to resize
                return encoded, mime_type
                
            # Resize the image
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            img = img.resize((new_width, new_height), Image.LANCZOS)
            
            # Save to BytesIO
            output = BytesIO()
            img_format = mime_type.split("/")[-1].upper()
            img.save(output, format=img_format)
            
            # Return compressed data
            compressed_data = base64.b64encode(output.getvalue()).decode("utf-8")
            return compressed_data, mime_type
            
    except Exception as e:
        logger.error(f"Error compressing image: {str(e)}")
        # Return the original data if compression fails
        if "," in image_data:
            header, encoded = image_data.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0]
            return encoded, mime_type
        return image_data, "image/jpeg"