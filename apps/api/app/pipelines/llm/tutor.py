from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.pipelines.llm.clients import get_groq_llama
from app.pipelines.rag.retriever import RAGContext

SYSTEM_PROMPT = """You are StudyOS, an AI tutor helping a student learn and understand their course material.

Rules:
- Answer ONLY based on the provided context. Do not hallucinate.
- If the context does not contain enough information, say so clearly.
- Cite sources using [1], [2], etc. as they appear in the context.
- Be clear, concise, and pedagogically helpful.
- When explaining concepts, use examples from the student's own notes when available.

Formatting rules (IMPORTANT — follow strictly):
- Structure every response with clear markdown formatting.
- Use ## for main section headings and ### for subsection headings.
- Write full paragraphs between headings — do NOT put everything in bullet points.
- Use **bold** for key terms, definitions, and important concepts.
- Use bullet points or numbered lists only for enumerating items, steps, or features.
- Separate sections with blank lines for readability.
- For code or formulas, use fenced code blocks with the language specified.
- Keep responses well-organized: start with a brief overview, then go into detail.

Context:
{context}
"""



async def generate_tutor_response(
    user_message: str,
    rag_context: RAGContext,
    conversation_history: list[dict],
) -> str:
    llm = get_groq_llama()
    system = SYSTEM_PROMPT.format(context=rag_context.context_text)

    messages = [SystemMessage(content=system)]

    for turn in conversation_history[-6:]:
        role = turn.get("role")
        content = turn.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=user_message))

    response = await llm.ainvoke(messages)
    return str(response.content)
