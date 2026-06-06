from dataclasses import dataclass

from app.pipelines.rag.vector_store import RetrievedChunk
from app.pipelines.rag.keyword_search import KeywordResult


@dataclass
class FusedChunk:
    id: str
    content: str
    rrf_score: float
    vector_rank: int | None      # 1-based, None if not in vector results
    keyword_rank: int | None     # 1-based, None if not in keyword results
    metadata: dict


def reciprocal_rank_fusion(
    vector_results: list[RetrievedChunk],
    keyword_results: list[KeywordResult],
    k: int = 60,
    vector_weight: float = 0.7,
    keyword_weight: float = 0.3,
    limit: int = 10,
) -> list[FusedChunk]:
    """
    Fuses two ranked lists using weighted RRF.

    Score = vector_weight * 1/(k + rank_v) + keyword_weight * 1/(k + rank_k)

    Chunks appearing in only one list still receive a partial score.
    The `k` constant dampens the effect of very high-ranked results — k=60
    is the value from the original RRF paper.
    """
    scores: dict[str, float] = {}
    vector_ranks: dict[str, int] = {}
    keyword_ranks: dict[str, int] = {}
    metadata_map: dict[str, dict] = {}
    content_map: dict[str, str] = {}

    for rank, chunk in enumerate(vector_results, start=1):
        scores[chunk.id] = scores.get(chunk.id, 0.0) + vector_weight * (1.0 / (k + rank))
        vector_ranks[chunk.id] = rank
        metadata_map[chunk.id] = chunk.metadata
        content_map[chunk.id] = chunk.content

    for rank, result in enumerate(keyword_results, start=1):
        scores[result.chunk_id] = scores.get(result.chunk_id, 0.0) + keyword_weight * (1.0 / (k + rank))
        keyword_ranks[result.chunk_id] = rank
        if result.chunk_id not in metadata_map:
            metadata_map[result.chunk_id] = result.metadata
            content_map[result.chunk_id] = result.content

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    return [
        FusedChunk(
            id=cid,
            content=content_map[cid],
            rrf_score=score,
            vector_rank=vector_ranks.get(cid),
            keyword_rank=keyword_ranks.get(cid),
            metadata=metadata_map[cid],
        )
        for cid, score in ranked[:limit]
    ]
