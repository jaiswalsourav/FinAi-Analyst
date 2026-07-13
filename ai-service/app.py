import os
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

class AskRequest(BaseModel):
    question: str

model = None
model_error = None

try:
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
except Exception as exc:
    model_error = str(exc)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "gemini_ready": bool(model),
        "message": "Gemini is ready" if model else "Set GEMINI_API_KEY to enable Gemini responses"
    }

@app.post("/ask")
def ask(req: AskRequest):
    if not model:
        if not os.getenv("GEMINI_API_KEY", "").strip():
            return {"answer": "Gemini API key not configured. Set GEMINI_API_KEY to enable AI responses."}
        return {"answer": f"Gemini client could not be initialized: {model_error}"}

    prompt = f"You are a financial analyst assistant. Answer the user's question clearly and concisely.\n\nQuestion: {req.question}"
    response = model.generate_content(prompt)
    return {"answer": response.text}
