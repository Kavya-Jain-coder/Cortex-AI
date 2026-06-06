import json
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.pipelines.llm.clients import get_gemini, get_groq_llama
from app.pipelines.rag.retriever import RAGContext


def _extract_json(raw: str) -> Any:
    text = raw.strip()
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        text = match.group(0)
    else:
        match_obj = re.search(r"\{.*\}", text, re.DOTALL)
        if match_obj:
            text = match_obj.group(0)
    return json.loads(text)


async def generate_quiz(rag_context: RAGContext, count: int, difficulty: str = "medium") -> list[dict]:
    prompt = f"""Generate exactly {count} multiple-choice quiz questions from the context.
Target difficulty level for the questions: {difficulty}.

Return only a valid JSON array of objects with exactly these keys:
- question (string)
- options (array of exactly 4 strings representing the choices)
- answer (string, must exactly match one of the 4 options)
- difficulty (string, must be "easy", "medium", or "hard")
- source_hint (string or null)

Context:
{rag_context.context_text}
"""
    llm = get_groq_llama()
    response = await llm.ainvoke([
        SystemMessage(content="You generate grounded study quizzes. Output only valid JSON."),
        HumanMessage(content=prompt),
    ])
    parsed = _extract_json(str(response.content))
    if not isinstance(parsed, list):
        raise RuntimeError("Quiz generator returned non-list JSON")
    return parsed


async def detect_weak_topics(rag_context: RAGContext, count: int) -> list[dict]:
    prompt = f"""Infer exactly {count} likely weak topics for a student from the provided material.

Prioritize concepts that are dense, repeated, prerequisite-heavy, or likely to be confused.
Return only valid JSON array items with:
- topic
- confidence: number from 0 to 1
- reason
- next_action

Context:
{rag_context.context_text}
"""
    llm = get_gemini()
    response = await llm.ainvoke([
        SystemMessage(content="You analyze study material for learning gaps. Output only valid JSON."),
        HumanMessage(content=prompt),
    ])
    parsed = _extract_json(str(response.content))
    if not isinstance(parsed, list):
        raise RuntimeError("Weak-topic detector returned non-list JSON")
    return parsed
