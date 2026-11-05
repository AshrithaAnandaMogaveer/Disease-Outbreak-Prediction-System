from app.rag.service import RAGService


def test_rag_retrieval_filters_and_ranks_by_region_and_freshness():
    service = RAGService()
    docs = [
        {
            "title": "Air quality alert in Bengaluru",
            "content": "Elevated particulate matter near Bengaluru may increase respiratory discomfort.",
            "source": "CPCB",
            "source_url": "https://cpcb.nic.in/",
            "category": "environment",
            "geography": "Bengaluru",
            "published_at": "2026-10-07T08:00:00Z",
            "credibility": 0.95,
        },
        {
            "title": "General public health guidance",
            "content": "Follow local public health guidance and seek medical advice when needed.",
            "source": "WHO",
            "source_url": "https://www.who.int/",
            "category": "health",
            "geography": "India",
            "published_at": "2025-06-01T00:00:00Z",
            "credibility": 0.98,
        },
    ]

    enriched = service._score_candidates(docs, region="Bengaluru", category="environment")
    assert enriched[0]["title"] == "Air quality alert in Bengaluru"
    assert enriched[0]["freshness"] in {"recent", "very_recent"}


def test_rag_handles_low_confidence_without_fabricating():
    service = RAGService()
    answer = service._grounding_guard("I need a diagnosis and a random exact risk score.")
    assert "insufficient reliable information" in answer.lower()
