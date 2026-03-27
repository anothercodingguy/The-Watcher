from fastapi import APIRouter
from pydantic import BaseModel
from services.ai_analyzer import analyze_incidents, ask_ai

router = APIRouter()


class AskRequest(BaseModel):
    question: str


@router.get("/current")
async def get_current_incident():
    """Return current AI-analyzed incident data."""
    return await analyze_incidents()


@router.post("/ask")
async def ask_question(req: AskRequest):
    """Process a natural language question about system health."""
    return await ask_ai(req.question)
