FROM python:3.11-slim

# Create a non-root user (Hugging Face Spaces runs as user 1000)
RUN useradd -m -u 1000 user
WORKDIR /code

# Copy and install dependencies
COPY backend/requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the entire workspace code with correct user ownership
COPY --chown=user . /code

# Ensure data directory exists and is writable
RUN mkdir -p /code/data && chown -R user:user /code/data

# Set environment variables for production
ENV DB_PATH=/code/data/smokesense.db
ENV SECRET_KEY=smokesense_ai_production_secret_key_2026

# Expose port 7860 (Hugging Face Spaces port)
EXPOSE 7860

# Run the FastAPI server using uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
