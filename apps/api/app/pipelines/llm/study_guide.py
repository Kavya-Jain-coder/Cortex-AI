from typing import List
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from app.pipelines.llm.clients import get_gemini

class Flashcard(BaseModel):
    question: str = Field(description="The question for the flashcard")
    answer: str = Field(description="The answer for the flashcard")

class StudyGuideResult(BaseModel):
    summary_markdown: str = Field(description="A comprehensive study guide summary in Markdown format. Use headings, bullet points, and LaTeX math formulas if applicable.")
    flashcards: List[Flashcard] = Field(description="A list of 5 key flashcards extracted from the document")

async def generate_proactive_study_guide(document_text: str, document_title: str) -> str:
    """
    Generates a markdown study guide with a summary and embedded flashcards.
    Returns the raw markdown string to be saved as a Note.
    """
    llm = get_gemini()
    structured_llm = llm.with_structured_output(StudyGuideResult)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert tutor for engineering students. Create a study guide based on the provided document text. The study guide MUST include a detailed summary using Markdown, bullet points, and LaTeX equations if relevant (use $$ for math). Also provide exactly 5 flashcards for the most important concepts."),
        ("user", "Document Title: {title}\n\nDocument Text (first 30000 chars):\n{text}")
    ])
    
    chain = prompt | structured_llm
    
    # We truncate text to 30000 chars to ensure it runs fast and fits easily, 
    # though Gemini Flash can handle much more.
    result: StudyGuideResult = await chain.ainvoke({
        "title": document_title,
        "text": document_text[:30000]
    })
    
    # Format the result into a beautiful single Markdown document
    markdown_content = f"# AI Study Guide: {document_title}\n\n"
    markdown_content += result.summary_markdown
    markdown_content += "\n\n## 💡 Key Flashcards\n\n"
    
    for i, fc in enumerate(result.flashcards, 1):
        markdown_content += f"**Q{i}:** {fc.question}  \n**A:** {fc.answer}\n\n"
        
    return markdown_content
