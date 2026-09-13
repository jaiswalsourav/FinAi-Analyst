"""
app/api/agent_api.py
FastAPI router for Gemini agent chat endpoints.
"""

from fastapi import APIRouter, HTTPException
import google.generativeai as genai

from app.core.config import settings
from app.core.cache import session_store
from app.schemas.agent import AgentAskRequest, AgentAskResponse
from app.tools.agent_tools import ALL_AGENT_TOOLS

router = APIRouter(prefix="/agent", tags=["AI Agent"])

agent_model = None
if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        agent_model = genai.GenerativeModel(
            model_name=settings.MODEL_NAME,
            tools=ALL_AGENT_TOOLS,
            system_instruction=(
                "You are an expert financial analyst. Use the provided tools to retrieve "
                "real-time market data, company financials, or documents from the vector store. "
                "Never invent numerical figures if a tool can retrieve them."
            )
        )
    except Exception as e:
        print("Gemini Agent initialization error:", e)


@router.post("/ask", response_model=AgentAskResponse)
def ask_agent(req: AgentAskRequest):
    """Multi-turn agent endpoint that autonomously triggers tools."""
    if agent_model is None:
        raise HTTPException(status_code=503, detail="Gemini agent not initialized")

    try:
        if req.session_id not in session_store:
            session_store[req.session_id] = agent_model.start_chat(
                enable_automatic_function_calling=True
            )

        chat = session_store[req.session_id]

        context_parts = []
        if req.symbol:
            context_parts.append(f"[Target Symbol: {req.symbol.upper()}]")
        if req.user_portfolio:
            context_parts.append(f"[User Portfolio: {', '.join(req.user_portfolio)}]")

        full_prompt = f"{' '.join(context_parts)} {req.prompt}".strip()
        response = chat.send_message(full_prompt)

        tools_executed = []
        for content in chat.history[-2:]:
            for part in content.parts:
                fn_call = getattr(part, "function_call", None)
                if fn_call:
                    tools_executed.append({
                        "name": fn_call.name,
                        "args": dict(fn_call.args)
                    })

        return AgentAskResponse(
            answer=response.text,
            session_id=req.session_id,
            tools_used=tools_executed
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent execution error: {str(e)}")