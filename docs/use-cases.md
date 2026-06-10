# Cortex AI - Use Cases & Workflows

Cortex AI (StudyOS) is built to be a highly versatile tool for anyone engaging in continuous learning, research, or structured study. Below are the primary use cases and how to get the most out of the platform.

## 1. The University Student
**Challenge**: Keeping track of lectures, research papers, textbooks, and studying for exams all at once.
**Workflow in Cortex**:
- **Organization**: Create a "Subject" for each course (e.g., *Organic Chemistry*, *Data Structures*).
- **Lecture Capture**: Use the **Rich Text Note Editor** to quickly type out lecture notes. 
- **Diagramming**: When a professor draws a complex molecule or data structure on the board, switch to a **Canvas Note** (`tldraw`) to quickly sketch it out using a stylus or mouse.
- **Library Upload**: Upload the course syllabus and textbook PDFs to the **Library**.
- **AI RAG (Chat)**: During exam week, go to the AI chat and ask: *"Summarize chapter 4 of the Data Structures textbook and explain Big O notation simply."* Cortex AI will fetch the exact context from the uploaded PDF and explain it to you.

## 2. The Medical or Law Student (Intense Memorization)
**Challenge**: Massive amounts of dense text to memorize in a short period of time.
**Workflow in Cortex**:
- **Document Ingestion**: Upload massive PDFs of medical journals or case law into the library. The Qdrant vector database processes the embeddings.
- **Smart Flashcards & Quizzes**: Use the AI tools to automatically generate flashcards and multiple-choice quizzes based on the specific documents you uploaded.
- **Active Recall**: Test yourself using the generated quizzes right inside the dashboard. Instead of reading passively, Cortex forces you to engage with the material.

## 3. The Researcher / Knowledge Worker
**Challenge**: Synthesizing information across dozens of academic papers or technical documentation.
**Workflow in Cortex**:
- **Cross-Referencing**: Upload all relevant PDFs for a research project into the Library.
- **Semantic Search**: Ask the AI: *"What are the common methodologies used across these three papers?"* Cortex uses its embedding models (BGE) and LLM (Gemini/Llama) to find semantic similarities across multiple different PDFs simultaneously and synthesize an answer.
- **Infinite Whiteboard**: Use the infinite Canvas Note to mind-map the connections between different papers, paste screenshots of key charts, and visually organize the research paper structure.

## 4. The Self-Taught Developer
**Challenge**: Learning from online tutorials, coding exercises, and documentation without a structured curriculum.
**Workflow in Cortex**:
- **Markdown & Code Blocks**: The Rich Text editor supports Markdown and code blocks natively, making it perfect for pasting code snippets and writing technical notes.
- **AI Debugging Tutor**: You can use the AI Chat tool not just for summarizing text, but as a technical tutor. Because it's powered by models like Llama 3 70B and Gemini 2.5, it is highly capable of explaining complex programming concepts.
- **Assignments Tracker**: Use the built-in Assignments dashboard to set self-imposed deadlines for completing specific coding projects or finishing modules of an online course.

---

## 💡 Best Practices

1. **Tag Everything**: Use the tagging system when creating notes. It makes finding old notes months later trivial.
2. **Contextualize AI Prompts**: When chatting with the AI, be specific about which documents you want it to reference. The RAG system works best when the search scope is clear.
3. **Mix Modalities**: Don't just stick to text. Creating visual memory anchors using the Canvas tool has been scientifically proven to improve long-term retention. Cortex allows you to mix text and visual canvases in the same workspace.
