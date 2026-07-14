import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskRequest(BaseModel):
    question: str

model = None
model_error = None
active_model_name = None
MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-1.5-flash-latest"]

def new_func():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    return api_key

try:
    import google.generativeai as genai

    api_key = new_func()
    if api_key:
        genai.configure(api_key=api_key)
        for candidate in MODEL_CANDIDATES:
            try:
                model = genai.GenerativeModel(candidate)
                active_model_name = candidate
                break
            except Exception as exc:
                model_error = str(exc)
except Exception as exc:
    model_error = str(exc)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "gemini_ready": bool(model),
        "message": "Gemini is ready" if model else "Set GEMINI_API_KEY to enable Gemini responses",
        "active_model": active_model_name or "none"
    }

@app.post("/ask")
def ask(req: AskRequest):
    if not model:
        if not os.getenv("GEMINI_API_KEY", "").strip():
            return {"answer": "Gemini API key not configured. Set GEMINI_API_KEY to enable AI responses."}
        return {"answer": f"Gemini client could not be initialized: {model_error}"}

    prompt = f"You are a financial analyst assistant. Answer the user's question clearly and concisely.\n\nQuestion: {req.question}"

    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as exc:
        return {"answer": f"Gemini request failed: {exc}"}
