import re
from dataclasses import dataclass, field

import tiktoken

TOKENIZER = tiktoken.get_encoding("cl100k_base")
CHUNK_SIZE = 400       # tokens
CHUNK_OVERLAP = 80     # tokens
MIN_CHUNK_SIZE = 50    # discard chunks below this


@dataclass
class ChunkMetadata:
    source_id: str
    source_type: str        # document | note | assignment
    user_id: str
    title: str
    subject_id: str | None
    topic: str | None
    semester: str | None
    note_type: str | None   # lecture | textbook | pyq | assignment | canvas | typed
    page: int | None
    chunk_index: int
    token_count: int
    tags: list[str] = field(default_factory=list)

    def to_qdrant_payload(self, content: str) -> dict:
        return {
            "content": content,
            "source_id": self.source_id,
            "source_type": self.source_type,
            "user_id": self.user_id,
            "title": self.title,
            "subject_id": self.subject_id,
            "topic": self.topic,
            "semester": self.semester,
            "note_type": self.note_type,
            "page": self.page,
            "chunk_index": self.chunk_index,
            "token_count": self.token_count,
            "tags": self.tags,
        }


@dataclass
class TextChunk:
    content: str
    chunk_index: int
    token_count: int
    page: int | None
    metadata: ChunkMetadata


def _count_tokens(text: str) -> int:
    return len(TOKENIZER.encode(text))


def _split_into_sentences(text: str) -> list[str]:
    """
    Splits on sentence boundaries. Handles:
    - Standard punctuation (.!?)
    - Newline-delimited lines (common in PDFs after extraction)
    """
    # First split on hard newlines (PDF-extracted text often uses them as sentence breaks)
    lines = text.split("\n")
    sentences: list[str] = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Further split each line on sentence-ending punctuation
        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"\(])", line)
        sentences.extend(p.strip() for p in parts if p.strip())
    return sentences


def chunk_text(
    text: str,
    source_id: str,
    source_type: str,
    user_id: str,
    title: str,
    subject_id: str | None = None,
    topic: str | None = None,
    semester: str | None = None,
    note_type: str | None = None,
    page: int | None = None,
    tags: list[str] | None = None,
) -> list[TextChunk]:
    """
    Sentence-boundary aware chunker with sliding overlap.
    Returns only chunks meeting the MIN_CHUNK_SIZE threshold.
    """
    sentences = _split_into_sentences(text)
    if not sentences:
        return []

    meta_kwargs = dict(
        source_id=source_id,
        source_type=source_type,
        user_id=user_id,
        title=title,
        subject_id=subject_id,
        topic=topic,
        semester=semester,
        note_type=note_type,
        tags=tags or [],
    )

    chunks: list[TextChunk] = []
    current_sentences: list[str] = []
    current_tokens = 0
    chunk_index = 0

    for sentence in sentences:
        sentence_tokens = _count_tokens(sentence)

        # Sentence exceeds full chunk size — word-split it
        if sentence_tokens > CHUNK_SIZE:
            if current_sentences:
                _flush(current_sentences, chunk_index, page, meta_kwargs, chunks)
                chunk_index += 1
                current_sentences, current_tokens = _compute_overlap(current_sentences)

            word_chunks = _split_long_sentence(sentence, chunk_index, page, meta_kwargs)
            chunks.extend(word_chunks)
            chunk_index += len(word_chunks)
            current_sentences = []
            current_tokens = 0
            continue

        if current_tokens + sentence_tokens > CHUNK_SIZE and current_sentences:
            _flush(current_sentences, chunk_index, page, meta_kwargs, chunks)
            chunk_index += 1
            current_sentences, current_tokens = _compute_overlap(current_sentences)

        current_sentences.append(sentence)
        current_tokens += sentence_tokens

    if current_sentences:
        _flush(current_sentences, chunk_index, page, meta_kwargs, chunks)

    return [c for c in chunks if c.token_count >= MIN_CHUNK_SIZE]


def _compute_overlap(sentences: list[str]) -> tuple[list[str], int]:
    """Return the suffix of sentences that fits within CHUNK_OVERLAP tokens."""
    overlap: list[str] = []
    tokens = 0
    for s in reversed(sentences):
        st = _count_tokens(s)
        if tokens + st > CHUNK_OVERLAP:
            break
        overlap.insert(0, s)
        tokens += st
    return overlap, tokens


def _flush(
    sentences: list[str],
    index: int,
    page: int | None,
    meta_kwargs: dict,
    out: list[TextChunk],
) -> None:
    content = " ".join(sentences)
    token_count = _count_tokens(content)
    meta = ChunkMetadata(
        page=page,
        chunk_index=index,
        token_count=token_count,
        **meta_kwargs,
    )
    out.append(TextChunk(content=content, chunk_index=index, token_count=token_count, page=page, metadata=meta))


def _split_long_sentence(
    sentence: str,
    start_index: int,
    page: int | None,
    meta_kwargs: dict,
) -> list[TextChunk]:
    words = sentence.split()
    chunks: list[TextChunk] = []
    current_words: list[str] = []
    current_tokens = 0
    idx = start_index

    for word in words:
        wt = _count_tokens(word)
        if current_tokens + wt > CHUNK_SIZE and current_words:
            content = " ".join(current_words)
            tc = _count_tokens(content)
            meta = ChunkMetadata(page=page, chunk_index=idx, token_count=tc, **meta_kwargs)
            chunks.append(TextChunk(content=content, chunk_index=idx, token_count=tc, page=page, metadata=meta))
            idx += 1
            current_words = []
            current_tokens = 0
        current_words.append(word)
        current_tokens += wt

    if current_words:
        content = " ".join(current_words)
        tc = _count_tokens(content)
        meta = ChunkMetadata(page=page, chunk_index=idx, token_count=tc, **meta_kwargs)
        chunks.append(TextChunk(content=content, chunk_index=idx, token_count=tc, page=page, metadata=meta))

    return chunks
