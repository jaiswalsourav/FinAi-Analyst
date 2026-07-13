# FinAI Analyst

A starter full-stack project for a financial analyst assistant that combines:
- React for the web experience
- Java Spring Boot for the backend API
- Python FastAPI for Gemini-powered AI analysis

## Architecture

- Frontend: React + Vite
- Backend: Java Spring Boot
- AI service: Python FastAPI with Gemini integration
- Orchestration: Docker Compose

## Project Structure

```text
frontend/   React app
backend/    Java Spring Boot API
ai-service/ Python AI service
```

## Run locally

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080/api/health
- AI service: http://localhost:8001/health

## Environment

Set a Gemini API key before enabling full AI responses:

```bash
set GEMINI_API_KEY=your_key_here
```
