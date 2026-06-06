from langchain_core.messages import HumanMessage, SystemMessage

from app.pipelines.llm.clients import get_gemini
from app.pipelines.rag.retriever import RAGContext

PREDICTION_PROMPT = """You are an expert exam question predictor for university-level courses.

Based on the student's notes and past year questions provided, predict the most likely exam questions for the upcoming exam.

Output a JSON array with this exact structure:
[
  {{
    "question": "...",
    "topic": "...",
    "difficulty": "easy|medium|hard",
    "rationale": "Why this is likely to appear",
    "source_hints": ["topic area 1", "topic area 2"]
  }}
]

Generate exactly {count} questions. Be specific, exam-relevant, and grounded in the provided material.

Student material context:
{context}

Past year questions context:
{pyq_context}
"""


async def predict_questions(
    rag_context: RAGContext,
    pyq_context: RAGContext,
    count: int = 10,
) -> list[dict]:
    import json

    llm = get_gemini()

    prompt = PREDICTION_PROMPT.format(
        count=count,
        context=rag_context.context_text,
        pyq_context=pyq_context.context_text,
    )

    response = await llm.ainvoke([
        SystemMessage(content="You are a precise exam question predictor. Output only valid JSON."),
        HumanMessage(content=prompt),
    ])

    raw = str(response.content).strip()

    import json
    import re

    # Find the JSON array inside the output
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        raw_json = match.group(0)
    else:
        raw_json = raw

    try:
        questions = json.loads(raw_json)
        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array")
        return questions
    except (json.JSONDecodeError, ValueError) as e:
        raise RuntimeError(f"Question prediction output was not valid JSON: {e}\nRaw output was: {raw}") from e
