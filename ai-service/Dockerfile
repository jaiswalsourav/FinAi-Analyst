FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (leverages Docker layer caching)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the modular application directory
COPY app/ ./app

EXPOSE 8001

# Point to app.main:app instead of app:app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
