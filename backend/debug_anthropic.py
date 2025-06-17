import os
import anthropic
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the API key
api_key = os.environ.get("ANTHROPIC_API_KEY")
print(f"API key present: {bool(api_key)}")
if api_key:
    print(f"API key starts with: {api_key[:8]}...")

# Try to initialize the client
try:
    client = anthropic.Anthropic(api_key=api_key)
    print("Client initialized successfully!")
    
    # Try a simple request
    response = client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=100,
        system="You are a helpful assistant.",
        messages=[
            {"role": "user", "content": "Hello, Claude! Can you hear me?"}
        ]
    )
    print("API response received!")
    print(f"Response: {response.content[0].text}")
except Exception as e:
    print(f"Error: {str(e)}")