"""
Hallucination Detection Service

Analyzes user-submitted outbreak reports to determine if they are likely
grounded in factual data or potentially fabricated/hallucinated.

Uses multiple signals:
1. RAG evidence matching (does trusted documentation mention this?)
2. Specificity analysis (overly vague or suspiciously detailed?)
3. Temporal consistency (is the observation date reasonable?)
4. Geographic validity (is the location real and specific?)
"""
from datetime import datetime, timedelta
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.models.outbreak_report import OutbreakReport
from app.rag.service import RAGService


class HallucinationDetector:
    """Detects potentially hallucinated or fabricated outbreak reports."""
    
    def __init__(self, db: Session):
        self.db = db
        self.rag_service = RAGService(db=db)
    
    def analyze_report(self, report: OutbreakReport) -> Dict[str, Any]:
        """
        Analyze an outbreak report for hallucination indicators.
        
        Returns:
            dict with keys:
                - confidence_score: float 0-100 (higher = more likely factual)
                - risk_level: "low" | "medium" | "high" (hallucination risk)
                - signals: dict of individual signal scores
                - recommendation: str explaining the assessment
                - evidence_summary: str from RAG
        """
        signals = {}
        
        # Signal 1: RAG Evidence Matching
        rag_signal = self._check_rag_evidence(report)
        signals["rag_evidence"] = rag_signal
        
        # Signal 2: Specificity Analysis
        specificity_signal = self._check_specificity(report)
        signals["specificity"] = specificity_signal
        
        # Signal 3: Temporal Consistency
        temporal_signal = self._check_temporal_consistency(report)
        signals["temporal"] = temporal_signal
        
        # Signal 4: Geographic Validity
        geographic_signal = self._check_geographic_validity(report)
        signals["geographic"] = geographic_signal
        
        # Compute overall confidence score (weighted average)
        weights = {
            "rag_evidence": 0.4,  # RAG matching is most important
            "specificity": 0.2,
            "temporal": 0.2,
            "geographic": 0.2,
        }
        
        confidence_score = sum(
            signals[key]["score"] * weights[key]
            for key in weights.keys()
        )
        
        # Determine risk level
        if confidence_score >= 70:
            risk_level = "low"
            recommendation = "Report appears well-grounded and specific. Low risk of fabrication."
        elif confidence_score >= 40:
            risk_level = "medium"
            recommendation = "Report has some supporting evidence but lacks complete verification. Review carefully."
        else:
            risk_level = "high"
            recommendation = "Report lacks strong supporting evidence. High risk of hallucination or fabrication. Verify independently before approval."
        
        return {
            "confidence_score": round(confidence_score, 1),
            "risk_level": risk_level,
            "signals": signals,
            "recommendation": recommendation,
            "evidence_summary": signals["rag_evidence"].get("summary", "No evidence found"),
        }
    
    def _check_rag_evidence(self, report: OutbreakReport) -> Dict[str, Any]:
        """
        Check if RAG system finds supporting evidence for this report.
        Returns score 0-100 and summary.
        """
        query = f"{report.disease_name} outbreak {report.state or ''} {report.district or ''}"
        
        try:
            result = self.rag_service.answer_question(
                question=query,
                region=report.state or "India",
                category=None,
            )
            
            grounded = result.get("grounded", False)
            sources = result.get("sources", [])
            answer = result.get("answer", "")
            
            # Score based on grounding and source quality
            if grounded and len(sources) >= 2:
                score = 90  # Strong evidence with multiple sources
            elif grounded and len(sources) == 1:
                score = 70  # Good evidence from one source
            elif len(sources) > 0:
                score = 50  # Weak evidence, not well grounded
            else:
                score = 20  # No evidence found
            
            return {
                "score": score,
                "grounded": grounded,
                "source_count": len(sources),
                "summary": answer[:200] if answer else "No matching evidence found in trusted sources.",
                "sources": sources[:3],  # Top 3 sources
            }
        
        except Exception as e:
            # RAG failure - default to neutral score
            return {
                "score": 50,
                "grounded": False,
                "source_count": 0,
                "summary": f"Evidence check unavailable: {str(e)}",
                "sources": [],
            }
    
    def _check_specificity(self, report: OutbreakReport) -> Dict[str, Any]:
        """
        Check if report has appropriate level of specificity.
        Too vague OR suspiciously detailed can indicate fabrication.
        """
        description = report.description or ""
        desc_len = len(description)
        
        # Check for minimum information
        has_location = bool(report.district or report.locality)
        has_cases = report.reported_cases is not None and report.reported_cases > 0
        has_description = desc_len >= 50
        
        # Too short (vague)
        if desc_len < 20:
            score = 30
            detail = "Description is too vague"
        # Too long (suspiciously detailed, like AI-generated text)
        elif desc_len > 800:
            score = 40
            detail = "Description is suspiciously detailed"
        # Good range with key information
        elif has_location and has_cases and has_description:
            score = 90
            detail = "Appropriate level of detail with specific information"
        # Missing some key information
        elif has_description:
            score = 60
            detail = "Has description but missing some location or case details"
        else:
            score = 40
            detail = "Insufficient detail provided"
        
        return {
            "score": score,
            "detail": detail,
            "description_length": desc_len,
        }
    
    def _check_temporal_consistency(self, report: OutbreakReport) -> Dict[str, Any]:
        """
        Check if observation date is reasonable.
        Reports about future dates or very old dates are suspicious.
        """
        if not report.observation_date:
            return {
                "score": 50,
                "detail": "No observation date provided",
            }
        
        now = datetime.utcnow().date()
        obs_date = report.observation_date.date() if isinstance(report.observation_date, datetime) else report.observation_date
        
        days_diff = (now - obs_date).days
        
        # Future date = hallucination
        if days_diff < 0:
            score = 0
            detail = "Observation date is in the future (impossible)"
        # Very recent (within 30 days) = good
        elif 0 <= days_diff <= 30:
            score = 95
            detail = "Recent observation date"
        # Recent (within 90 days) = acceptable
        elif 30 < days_diff <= 90:
            score = 80
            detail = "Relatively recent observation"
        # Older (within 1 year) = suspicious but possible
        elif 90 < days_diff <= 365:
            score = 50
            detail = "Old observation date, verify if still relevant"
        # Very old (> 1 year) = likely stale or fabricated
        else:
            score = 20
            detail = "Very old observation date, likely irrelevant"
        
        return {
            "score": score,
            "detail": detail,
            "days_ago": days_diff,
        }
    
    def _check_geographic_validity(self, report: OutbreakReport) -> Dict[str, Any]:
        """
        Check if geographic information is valid and specific.
        Missing state or obviously fake locations are red flags.
        """
        if not report.state:
            return {
                "score": 10,
                "detail": "Missing state information",
            }
        
        # Check state is not empty or generic
        state = report.state.strip().lower()
        if not state or state in ["unknown", "n/a", "test", "sample"]:
            return {
                "score": 20,
                "detail": "Invalid or placeholder state name",
            }
        
        # Having district adds specificity
        has_district = bool(report.district and report.district.strip())
        has_locality = bool(report.locality and report.locality.strip())
        
        if has_locality:
            score = 95
            detail = "Specific location with locality"
        elif has_district:
            score = 85
            detail = "Specific location with district"
        else:
            score = 60
            detail = "Only state-level location provided"
        
        return {
            "score": score,
            "detail": detail,
            "has_district": has_district,
            "has_locality": has_locality,
        }


def analyze_report_for_hallucination(db: Session, report: OutbreakReport) -> Dict[str, Any]:
    """
    Convenience function to analyze a report for hallucination.
    
    Args:
        db: Database session
        report: OutbreakReport to analyze
    
    Returns:
        Analysis dict with confidence_score, risk_level, signals, recommendation
    """
    detector = HallucinationDetector(db)
    return detector.analyze_report(report)
