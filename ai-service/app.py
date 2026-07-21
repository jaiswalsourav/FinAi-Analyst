import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from google import genai


# ==========================
# Load Environment
# ==========================

env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY")


print("Env:", env_path)
print("API Key Loaded:", bool(api_key))


# ==========================
# FastAPI
# ==========================

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================
# Request Model
# ==========================

class AskRequest(BaseModel):
    question: str



# ==========================
# Gemini Setup
# ==========================

client = None

MODEL = "gemini-2.0-flash"


if api_key:
    try:
        client = genai.Client(
            api_key=api_key
        )

        print("Gemini Connected")

    except Exception as e:
        print("Gemini Error:", e)



# ==========================
# Health Check
# ==========================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "gemini": client is not None,
        "model": MODEL
    }



# ==========================
# Ask API
# ==========================

@app.post("/ask")
def ask(req: AskRequest):

    if client is None:
        return {
            "answer": "Gemini not initialized"
        }


    try:

        response = client.models.generate_content(
            model=MODEL,
            contents=req.question
        )


        return {
            "answer": response.text
        }


    except Exception as e:

        return {
            "answer": str(e)
        }



# ==========================
# Run
# ==========================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001
    )