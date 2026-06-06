import pytest
from app.pipelines.chunking.chunker import CHUNK_SIZE, MIN_CHUNK_SIZE, chunk_text

SAMPLE_TEXT = (
    "Machine learning is a subset of artificial intelligence. "
    "It focuses on building systems that learn from data. "
    "Supervised learning uses labeled training data. "
    "Unsupervised learning finds patterns without labels. "
    "Reinforcement learning trains agents through rewards. "
    "Neural networks are inspired by the human brain. "
    "Deep learning uses multi-layer neural networks. "
    "Gradient descent optimizes model parameters iteratively. "
    "Overfitting occurs when a model memorizes training data. "
    "Regularization techniques help prevent overfitting. "
)

BASE_KWARGS = dict(
    source_id="note-123",
    source_type="note",
    user_id="user-abc",
    title="ML Notes",
)


def test_chunk_text_returns_chunks():
    chunks = chunk_text(text=SAMPLE_TEXT * 10, **BASE_KWARGS)
    assert len(chunks) > 0


def test_chunk_metadata_is_complete():
    chunks = chunk_text(
        text=SAMPLE_TEXT,
        source_id="note-abc",
        source_type="note",
        user_id="user-1",
        title="Test Note",
        subject_id="subj-1",
        topic="Supervised Learning",
        semester="Fall 2024",
        note_type="lecture",
        tags=["ml", "ai"],
    )
    for chunk in chunks:
        m = chunk.metadata
        assert m.source_id == "note-abc"
        assert m.source_type == "note"
        assert m.user_id == "user-1"
        assert m.subject_id == "subj-1"
        assert m.topic == "Supervised Learning"
        assert m.semester == "Fall 2024"
        assert m.note_type == "lecture"
        assert m.tags == ["ml", "ai"]
        assert isinstance(m.chunk_index, int)
        assert isinstance(m.token_count, int)


def test_no_chunk_exceeds_token_limit():
    chunks = chunk_text(text=SAMPLE_TEXT * 20, **BASE_KWARGS)
    for chunk in chunks:
        assert chunk.token_count <= CHUNK_SIZE + 50


def test_min_chunk_size_filter():
    chunks = chunk_text(text="Short.", **BASE_KWARGS)
    assert all(c.token_count >= MIN_CHUNK_SIZE for c in chunks)


def test_chunk_indices_are_sequential():
    chunks = chunk_text(text=SAMPLE_TEXT * 5, **BASE_KWARGS)
    indices = [c.chunk_index for c in chunks]
    assert indices == sorted(indices)
    assert indices[0] == 0


def test_page_number_propagated():
    chunks = chunk_text(text=SAMPLE_TEXT, page=3, **BASE_KWARGS)
    for chunk in chunks:
        assert chunk.page == 3
        assert chunk.metadata.page == 3


def test_empty_text_returns_no_chunks():
    chunks = chunk_text(text="   ", **BASE_KWARGS)
    assert chunks == []


def test_qdrant_payload_has_required_fields():
    chunks = chunk_text(
        text=SAMPLE_TEXT,
        source_id="doc-1",
        source_type="document",
        user_id="user-1",
        title="PDF Doc",
        subject_id="subj-2",
        note_type="textbook",
    )
    assert len(chunks) > 0
    payload = chunks[0].metadata.to_qdrant_payload(chunks[0].content)
    for key in ("content", "source_id", "source_type", "user_id", "title",
                "subject_id", "note_type", "chunk_index", "token_count"):
        assert key in payload
