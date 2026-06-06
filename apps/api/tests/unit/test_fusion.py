import pytest
from app.pipelines.rag.fusion import reciprocal_rank_fusion
from app.pipelines.rag.vector_store import RetrievedChunk
from app.pipelines.rag.keyword_search import KeywordResult


def _vec(chunk_id: str, score: float, content: str = "content") -> RetrievedChunk:
    return RetrievedChunk(
        id=chunk_id,
        content=content,
        score=score,
        metadata={"source_id": chunk_id, "source_type": "note", "title": "T", "page": None, "chunk_index": 0},
    )


def _kw(chunk_id: str, rank: float, content: str = "content") -> KeywordResult:
    return KeywordResult(
        chunk_id=chunk_id,
        content=content,
        rank=rank,
        metadata={"source_id": chunk_id, "source_type": "note", "title": "T", "page": None, "chunk_index": 0},
    )


def test_rrf_respects_limit():
    vectors = [_vec(f"v{i}", 0.9 - i * 0.1) for i in range(10)]
    keywords = [_kw(f"v{i}", 1.0 - i * 0.1) for i in range(10)]
    result = reciprocal_rank_fusion(vectors, keywords, limit=5)
    assert len(result) == 5


def test_rrf_chunk_in_both_lists_scores_higher():
    # chunk "shared" appears in both; "vector_only" only in vector results
    vectors = [_vec("shared", 0.9), _vec("vector_only", 0.85)]
    keywords = [_kw("shared", 0.9), _kw("keyword_only", 0.8)]
    result = reciprocal_rank_fusion(vectors, keywords, limit=10)

    scores = {r.id: r.rrf_score for r in result}
    assert scores["shared"] > scores["vector_only"]
    assert scores["shared"] > scores["keyword_only"]


def test_rrf_tracks_ranks():
    vectors = [_vec("a", 0.9), _vec("b", 0.8)]
    keywords = [_kw("b", 0.9), _kw("a", 0.7)]
    result = reciprocal_rank_fusion(vectors, keywords, limit=10)

    by_id = {r.id: r for r in result}
    assert by_id["a"].vector_rank == 1
    assert by_id["a"].keyword_rank == 2
    assert by_id["b"].vector_rank == 2
    assert by_id["b"].keyword_rank == 1


def test_rrf_vector_only_chunk_has_no_keyword_rank():
    vectors = [_vec("v_only", 0.9)]
    keywords = []
    result = reciprocal_rank_fusion(vectors, keywords, limit=10)
    assert result[0].keyword_rank is None
    assert result[0].vector_rank == 1


def test_rrf_empty_inputs():
    result = reciprocal_rank_fusion([], [], limit=10)
    assert result == []


def test_rrf_scores_are_descending():
    vectors = [_vec(f"c{i}", 0.9 - i * 0.05) for i in range(6)]
    keywords = [_kw(f"c{i}", 1.0 - i * 0.1) for i in range(4)]
    result = reciprocal_rank_fusion(vectors, keywords, limit=10)
    scores = [r.rrf_score for r in result]
    assert scores == sorted(scores, reverse=True)
