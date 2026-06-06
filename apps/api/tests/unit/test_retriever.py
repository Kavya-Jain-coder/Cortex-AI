import pytest
from app.pipelines.rag.retriever import _build_citations, _build_context_text
from app.pipelines.rag.fusion import FusedChunk


def _make_fused(
    content: str,
    rrf_score: float,
    title: str = "Note",
    page: int | None = None,
    source_id: str = "src-1",
    source_type: str = "note",
    chunk_index: int = 0,
    vector_rank: int | None = 1,
    keyword_rank: int | None = None,
) -> FusedChunk:
    return FusedChunk(
        id="chunk-1",
        content=content,
        rrf_score=rrf_score,
        vector_rank=vector_rank,
        keyword_rank=keyword_rank,
        metadata={
            "source_id": source_id,
            "source_type": source_type,
            "title": title,
            "page": page,
            "chunk_index": chunk_index,
            "topic": None,
        },
    )


def test_build_context_text_includes_source_label():
    chunks = [
        _make_fused("Neural networks are powerful.", 0.9, title="ML Notes", page=2),
        _make_fused("Gradient descent minimizes loss.", 0.8, title="Optimization", page=5),
    ]
    result = _build_context_text(chunks)
    assert "[1]" in result
    assert "[2]" in result
    assert "ML Notes" in result
    assert "Optimization" in result
    assert "Neural networks are powerful." in result


def test_build_context_text_separates_chunks():
    chunks = [
        _make_fused("First chunk.", 0.9),
        _make_fused("Second chunk.", 0.8),
    ]
    result = _build_context_text(chunks)
    assert "---" in result


def test_build_context_text_empty():
    result = _build_context_text([])
    assert result == ""


def test_build_context_page_unknown():
    chunks = [_make_fused("Content here.", 0.85, page=None)]
    result = _build_context_text(chunks)
    assert "no page" in result


def test_build_citations_fields():
    chunks = [
        _make_fused(
            "Some content about transformers.",
            0.92,
            title="DL Notes",
            page=4,
            source_id="doc-99",
            source_type="document",
            chunk_index=2,
            vector_rank=1,
            keyword_rank=3,
        )
    ]
    citations = _build_citations(chunks)
    assert len(citations) == 1
    c = citations[0]
    assert c.source_id == "doc-99"
    assert c.source_type == "document"
    assert c.title == "DL Notes"
    assert c.page == 4
    assert c.chunk_index == 2
    assert c.vector_rank == 1
    assert c.keyword_rank == 3
    assert 0 < c.rrf_score <= 1


def test_build_citations_excerpt_truncated():
    long_content = "word " * 200
    chunks = [_make_fused(long_content, 0.8)]
    citations = _build_citations(chunks)
    assert len(citations[0].excerpt) <= 200
