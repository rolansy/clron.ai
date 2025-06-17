FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Print environment variables for debugging
RUN echo "Checking environment setup"
RUN python -c "import os; print(f'ANTHROPIC_API_KEY set: {bool(os.environ.get(\"ANTHROPIC_API_KEY\"))}')"

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]