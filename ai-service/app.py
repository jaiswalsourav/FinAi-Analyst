import os
from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

class AskRequest(BaseModel):
    question: str

if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    model = None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ask")
def ask(req: AskRequest):
    if not model:
        return {"answer": "Gemini API key not configured. Set GEMINI_API_KEY to enable AI responses."}

    prompt = f"You are a financial analyst assistant. Answer the user's question clearly and concisely.\n\nQuestion: {req.question}"
    response = model.generate_content(prompt)
    return {"answer": response.text}
