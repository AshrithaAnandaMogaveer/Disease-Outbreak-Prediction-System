import hashlib
import math
import re
from collections import Counter
from typing import Iterable, List

STOP_WORDS = {
    "the", "a", "an", "and", "or", "for", "with", "from", "into", "about", "that",
    "this", "these", "those", "your", "their", "there", "what", "when", "where",
    "why", "how", "are", "is", "was", "were", "has", "have", "had", "been", "being",
    "as", "of", "to", "in", "on", "at", "by", "it", "its", "be", "can", "may", "should",
    "could", "would", "will", "not", "no", "yes", "we", "you", "they", "them", "our",
    "health", "risk", "public", "data", "information", "updates", "related"
}


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokenize(text: str) -> List[str]:
    tokens = normalize_text(text).split()
    return [t for t in tokens if t and t not in STOP_WORDS and len(t) > 2]


def build_embedding(text: str, dimension: int = 32) -> List[float]:
    tokens = _tokenize(text)
    if not tokens:
        return [0.0 for _ in range(dimension)]

    counts = Counter(tokens)
    total = sum(counts.values())
    vector = [0.0 for _ in range(dimension)]

    for token, count in counts.items():
        digest = hashlib.md5(token.encode("utf-8")).hexdigest()[-8:]
        idx = abs(int(digest, 16)) % dimension
        weight = count / total
        vector[idx] += weight

    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]
    return vector


def cosine_similarity(vec_a: Iterable[float], vec_b: Iterable[float]) -> float:
    a = list(vec_a)
    b = list(vec_b)
    if len(a) != len(b):
        raise ValueError("Embedding dimensions must match")
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
