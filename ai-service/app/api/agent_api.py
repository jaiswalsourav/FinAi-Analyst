"""
app/api/agent_api.py
FastAPI router for Gemini agent chat endpoints.
"""

import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

from fastapi import APIRouter, HTTPException
import google.generativeai as genai

from app.core.config import settings
from app.core.cache import session_lock, session_store
from app.core.prompts import SYSTEM_PROMPT
from app.schemas.agent import AgentAskRequest, AgentAskResponse
from app.service.market_data import _to_yf_symbol
from app.tools.agent_tools import ALL_AGENT_TOOLS

router = APIRouter(prefix="/agent", tags=["AI Agent"])

_models: dict = {}

# A stalled Gemini/tool call must fail before the backend's own 180s read timeout fires
GEMINI_CALL_TIMEOUT_S = 40   # per request to Gemini
ANSWER_DEADLINE_S = 150      # whole answer, including all tool-calling rounds
_executor = ThreadPoolExecutor(max_workers=8)


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
    """True when another model is worth trying: quota used up, model gone, or the model stalled."""
    text = str(exc).lower()
    return (
        "429" in text or "quota" in text or "no longer available" in text or "not found" in text
        or "504" in text or "deadline" in text or "timed out" in text
    )


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
    deadline = time.monotonic() + ANSWER_DEADLINE_S
    for model_name in [settings.MODEL_NAME, *settings.FALLBACK_MODELS]:
        # One chat per (session, model): a model's chat can't continue on another model
        key = f"{req.session_id}::{model_name}"
        # The model may stall or run out of quota, so we try the next one in the fallback list.
        try:
            with session_lock:
                chat = session_store.get(key)
                if chat is None:
                    chat = _get_model(model_name).start_chat(enable_automatic_function_calling=True)
                # Storing it again restarts the 1-hour timer, so an active conversation isn't dropped
                session_store[key] = chat

            history_start = len(chat.history)
            # The chat.send_message call may stall, so we run it in a thread and enforce a timeout.
            # future.result() will raise FutureTimeout if the call takes too long, and we can then try the next model.
            future = _executor.submit(
                chat.send_message, full_prompt, request_options={"timeout": GEMINI_CALL_TIMEOUT_S}
            )
            try:
                response = future.result(timeout=max(5, deadline - time.monotonic()))
            except FutureTimeout:
                # The worker may still be running; drop the chat so it can't be reused half-finished
                with session_lock:
                    session_store.pop(key, None)
                raise HTTPException(
                    status_code=504,
                    detail="The AI took too long to answer. Please try again or ask a simpler question.",
                )

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
        except HTTPException:
            raise
        except Exception as e:
            last_error = e
            if not _is_quota_error(e):
                break

    raise HTTPException(status_code=502, detail=f"Agent execution error: {last_error}")
