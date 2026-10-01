"""
app/api/agent_api.py
FastAPI router for Gemini agent chat endpoints.
"""

from fastapi import APIRouter, HTTPException
import google.generativeai as genai

from app.core.config import settings
from app.core.cache import session_store
from app.core.prompts import SYSTEM_PROMPT
from app.schemas.agent import AgentAskRequest, AgentAskResponse
from app.service.market_data import _to_yf_symbol
from app.tools.agent_tools import ALL_AGENT_TOOLS

router = APIRouter(prefix="/agent", tags=["AI Agent"])

_models: dict = {}


def _get_model(name: str):
    if name not in _models:
        _models[name] = genai.GenerativeModel(
            model_name=name,
            tools=ALL_AGENT_TOOLS,
            system_instruction=SYSTEM_PROMPT,
        )
    return _models[name]


if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        print("Gemini Agent initialization error:", e)


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "429" in text or "quota" in text or "no longer available" in text or "not found" in text


@router.post("/ask", response_model=AgentAskResponse)
def ask_agent(req: AgentAskRequest):
    """Multi-turn agent endpoint that autonomously triggers tools."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini agent not initialized")

    context_parts = []
    if req.symbol:
        context_parts.append(f"[Target Symbol: {_to_yf_symbol(req.symbol)}]")
    if req.user_portfolio:
        context_parts.append(f"[User Portfolio: {', '.join(req.user_portfolio)}]")
    full_prompt = f"{' '.join(context_parts)} {req.prompt}".strip()

    last_error = None
    for model_name in [settings.MODEL_NAME, *settings.FALLBACK_MODELS]:
        # One chat per (session, model): a model's chat can't continue on another model
        key = f"{req.session_id}::{model_name}"
        try:
            if key not in session_store:
                session_store[key] = _get_model(model_name).start_chat(
                    enable_automatic_function_calling=True
                )
            chat = session_store[key]
            history_start = len(chat.history)
            response = chat.send_message(full_prompt)

            tools_executed = []
            for content in chat.history[history_start:]:
                for part in content.parts:
                    fn_call = getattr(part, "function_call", None)
                    if fn_call:
                        tools_executed.append({"name": fn_call.name, "args": dict(fn_call.args)})

            return AgentAskResponse(
                answer=response.text,
                session_id=req.session_id,
                tools_used=tools_executed,
            )
        except Exception as e:
            last_error = e
            if not _is_quota_error(e):
                break

    raise HTTPException(status_code=502, detail=f"Agent execution error: {last_error}")
