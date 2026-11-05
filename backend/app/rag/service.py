from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.rag_chunk import RAGChunk
from app.models.rag_document import RAGDocument
from app.models.published_outbreak import PublishedOutbreakRecord
from app.rag.embeddings import build_embedding, cosine_similarity
from app.rag.sources import TRUSTED_SOURCE_DEFINITIONS
from app.rag.vector_store import VectorStore
from app.services.agents.mistral_service import get_mistral_response


class RAGService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.vector_store = VectorStore(self.db)
        self._ensure_seed_documents()

    def _ensure_seed_documents(self) -> None:
        if self.db.query(RAGDocument).count() > 0:
            return
        for payload in TRUSTED_SOURCE_DEFINITIONS:
            self.vector_store.store_document({
                "title": payload["title"],
                "source_name": payload["source_name"],
                "source_url": payload["source_url"],
                "category": payload["category"],
                "geography": payload["geography"],
                "published_at": payload["published_at"],
                "content": payload["content"],
                "credibility": payload["credibility"],
            })

    def _parse_datetime(self, value: Any) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return None
        return None

    def _freshness_label(self, published_at: Any) -> str:
        value = self._parse_datetime(published_at)
        if value is None:
            return "recent"
        age_days = (datetime.now(timezone.utc) - value.astimezone(timezone.utc)).total_seconds() / 86400
        if age_days <= 3:
            return "very_recent"
        if age_days <= 30:
            return "recent"
        return "stale"

    def _score_candidates(self, docs: List[Dict[str, Any]], region: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        tokens = []
        if region:
            tokens.append(str(region).lower())
        if category:
            tokens.append(str(category).lower())

        scored = []
        for item in docs:
            title = str(item.get("title") or "")
            content = str(item.get("content") or "")
            geography = str(item.get("geography") or item.get("location") or "India").lower()
            item_category = str(item.get("category") or "health").lower()
            region_match = 0.0
            if region:
                if str(region).lower() in geography or geography in str(region).lower():
                    region_match = 1.0
                elif "india" in geography or "global" in geography:
                    region_match = 0.5
            category_match = 1.0 if not category or item_category == str(category).lower() else 0.4
            credibility = float(item.get("credibility", 0.5) or 0.5)
            published_at = self._parse_datetime(item.get("published_at"))
            freshness = self._freshness_label(published_at)
            age_days = 0.0
            if published_at:
                age_days = (datetime.now(timezone.utc) - published_at.astimezone(timezone.utc)).total_seconds() / 86400
            freshness_score = max(0.0, 1.0 - min(age_days / 45.0, 1.0))
            text = (title + " " + content).lower()
            keyword_match = 0.0
            if region:
                keyword_match += 0.4 if str(region).lower() in text else 0.0
            if category:
                keyword_match += 0.4 if str(category).lower() in text else 0.0
            similarity = float(item.get("relevance_score", item.get("similarity", 0.0)) or 0.0)
            score = (similarity * 0.35) + (region_match * 0.25) + (category_match * 0.2) + (freshness_score * 0.1) + (credibility * 0.1) + (keyword_match * 0.2)
            record = dict(item)
            record["region_match"] = region_match
            record["category_match"] = category_match
            record["freshness"] = freshness
            record["relevance_score"] = round(max(score, 0.0), 4)
            scored.append(record)
        return sorted(scored, key=lambda entry: entry["relevance_score"], reverse=True)

    def _grounding_guard(self, question: str) -> Optional[str]:
        text = question.lower()
        unsupported_signals = [
            "diagnosis", "diagnose", "prescribe", "treatment plan", "exact risk score",
            "what is my exact risk score", "tell me my diagnosis", "medical advice"
        ]
        if any(signal in text for signal in unsupported_signals):
            return (
                "insufficient reliable information: I couldn't find sufficiently reliable information to answer that confidently. "
                "I can explain general health guidance and public-health context, but I won't infer a diagnosis or fabricate a risk score."
            )
        return None

    def _get_published_outbreaks_as_documents(self, query: str, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve published outbreak records and format them as RAG documents."""
        outbreak_query = self.db.query(PublishedOutbreakRecord).filter(
            PublishedOutbreakRecord.publication_status == "published"
        )
        
        # Extract disease name from query - with more variations
        query_lower = query.lower()
        
        # Disease keywords with synonyms
        disease_mappings = {
            "dengue": ["dengue"],
            "malaria": ["malaria"],
            "cholera": ["cholera"],
            "typhoid": ["typhoid"],
            "chikungunya": ["chikungunya"],
            "plague": ["plague", "bubonic"],
            "tuberculosis": ["tuberculosis", "tb"],
            "covid": ["covid", "corona", "coronavirus", "covid-19", "covid19", "sars-cov-2"],
            "hepatitis": ["hepatitis"],
            "japanese encephalitis": ["japanese encephalitis", "encephalitis"],
            "leptospirosis": ["leptospirosis"],
            "viral fever": ["viral fever", "fever"],
            "influenza": ["influenza", "flu"],
            "measles": ["measles"],
            "mumps": ["mumps"],
            "rubella": ["rubella"],
        }
        
        disease_filter = None
        for disease, keywords in disease_mappings.items():
            for keyword in keywords:
                if keyword in query_lower:
                    disease_filter = disease
                    # Search for any of the variations
                    from sqlalchemy import or_
                    disease_filters = [PublishedOutbreakRecord.disease.ilike(f"%{kw}%") for kw in keywords]
                    outbreak_query = outbreak_query.filter(or_(*disease_filters))
                    break
            if disease_filter:
                break
        
        # If NO disease was mentioned, return empty list (will route to admin)
        if not disease_filter:
            return []
        
        # Filter by region if provided OR if mentioned in query
        # But skip if region is "India" (default, includes all)
        region_keywords = []
        if region and region.lower() not in ["india", "all"]:
            region_keywords.append(region.lower())
        
        # Extract location from query - expanded list
        import re
        states = ["andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", 
                 "gujarat", "haryana", "himachal pradesh", "himachal", "jammu and kashmir", "kashmir", 
                 "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", 
                 "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", 
                 "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal", 
                 "delhi", "mumbai", "bangalore", "chennai", "kolkata", "hyderabad", "pune", 
                 "ahmedabad", "jaipur", "surat", "lucknow", "kanpur", "nagpur", "indore", "bhopal",
                 "shimla", "manali", "darjeeling", "gangtok", "srinagar", "leh"]
        
        for state in states:
            if state in query_lower:
                region_keywords.append(state)
        
        if region_keywords:
            from sqlalchemy import or_
            region_filters = []
            for kw in region_keywords:
                region_filters.append(PublishedOutbreakRecord.state.ilike(f"%{kw}%"))
                region_filters.append(PublishedOutbreakRecord.district.ilike(f"%{kw}%"))
                region_filters.append(PublishedOutbreakRecord.locality.ilike(f"%{kw}%"))
            outbreak_query = outbreak_query.filter(or_(*region_filters))
        
        # Get recent outbreaks (last 180 days for more coverage)
        # Handle both naive and timezone-aware datetimes
        recent_date = datetime.now(timezone.utc) - timedelta(days=180)
        # Convert to naive datetime for comparison with DB timestamps
        recent_date_naive = recent_date.replace(tzinfo=None)
        outbreak_query = outbreak_query.filter(
            PublishedOutbreakRecord.updated_at >= recent_date_naive
        )
        
        # Get matching outbreaks
        outbreaks = outbreak_query.order_by(
            PublishedOutbreakRecord.updated_at.desc()
        ).limit(15).all()
        
        outbreak_docs = []
        for outbreak in outbreaks:
            # Create a document from outbreak data
            location = f"{outbreak.district}, {outbreak.state}" if outbreak.district else outbreak.state
            if outbreak.locality:
                location = f"{outbreak.locality}, {location}"
            
            content = f"""Outbreak: {outbreak.disease} in {location}
Reported Cases: {outbreak.reported_cases or 'Not specified'}
Active Cases: {outbreak.active_cases or 'Not specified'}
Recoveries: {outbreak.recoveries or 'Not specified'}
Deaths: {outbreak.deaths or 'Not specified'}
Risk Level: {outbreak.risk_level or 'Medium'}

Description: {outbreak.description}

Source: {outbreak.source_name}
Last Updated: {outbreak.updated_at.strftime('%Y-%m-%d %H:%M') if outbreak.updated_at else 'Unknown'}"""
            
            if outbreak.source_reference:
                content += f"\nReference: {outbreak.source_reference}"
            
            doc = {
                "title": f"{outbreak.disease} outbreak in {location}",
                "content": content,
                "source": outbreak.source_name or "Official health records",
                "source_url": outbreak.source_reference or "N/A",
                "category": "outbreak_data",
                "geography": outbreak.state,
                "location": location,
                "published_at": outbreak.updated_at.strftime('%Y-%m-%d') if outbreak.updated_at else datetime.utcnow().strftime('%Y-%m-%d'),
                "credibility": 0.95,
                "relevance_score": 0.0,
                "outbreak_id": outbreak.id,
                "disease": outbreak.disease,
                "cases": outbreak.reported_cases,
                "deaths": outbreak.deaths,
                "risk_level": outbreak.risk_level,
            }
            outbreak_docs.append(doc)
        
        return outbreak_docs

    def search(self, query: str, region: Optional[str] = None, category: Optional[str] = None, timeframe_days: int = 30, limit: int = 6) -> List[Dict[str, Any]]:
        # Get published outbreak data first
        outbreak_docs = self._get_published_outbreaks_as_documents(query, region=region)
        
        # Get regular RAG documents
        documents = self.db.query(RAGDocument).filter(RAGDocument.status == "active").all()
        candidate_docs = []
        for document in documents:
            if category and str(document.category).lower() != str(category).lower():
                continue
            if region and str(region).lower() not in (str(document.geography or "").lower(), "india", "global"):
                if str(document.geography or "").lower() not in str(region).lower():
                    continue
            published_at = document.published_at
            if published_at:
                age_days = (datetime.now(timezone.utc) - published_at.astimezone(timezone.utc)).total_seconds() / 86400
                if age_days > timeframe_days:
                    continue
            chunk = self.db.query(RAGChunk).filter(RAGChunk.document_id == document.id).order_by(RAGChunk.chunk_index.asc()).first()
            content = chunk.content if chunk else document.content
            base = {
                "title": document.title,
                "content": content,
                "source": document.source_name,
                "source_url": document.source_url,
                "category": document.category,
                "geography": document.geography,
                "location": document.geography,
                "published_at": document.published_at.isoformat() if document.published_at else None,
                "credibility": document.credibility,
                "relevance_score": 0.0,
            }
            candidate_docs.append(base)

        # Combine outbreak docs with regular docs
        all_docs = outbreak_docs + candidate_docs

        if not all_docs:
            return []

        query_vector = build_embedding(query)
        for item in all_docs:
            similarity = cosine_similarity(query_vector, build_embedding(f"{item['title']} {item['content']}"))
            item["relevance_score"] = similarity

        scored = self._score_candidates(all_docs, region=region, category=category)
        return scored[:limit]

    def _format_source_list(self, sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for source in sources:
            formatted.append({
                "title": source.get("title"),
                "source": source.get("source"),
                "url": source.get("source_url"),
                "published_date": source.get("published_at"),
                "category": source.get("category"),
            })
        return formatted

    def answer_question(self, question: str, region: Optional[str] = None, category: Optional[str] = None, analysis_id: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
        guard = self._grounding_guard(question)
        if guard:
            return {"answer": guard, "sources": [], "grounded": False}

        # First, ONLY search for outbreak data
        outbreak_docs = self._get_published_outbreaks_as_documents(question, region=region)
        
        # If NO outbreak data found, route to admin immediately
        if not outbreak_docs:
            return {
                "answer": "No published outbreak data found for your query. An administrator will review your question and provide a detailed response.",
                "sources": [],
                "grounded": False,
            }
        
        # If outbreak data found, use ONLY outbreak data
        sources = self._format_source_list(outbreak_docs)
        
        # Create detailed outbreak context
        outbreak_details = []
        for doc in outbreak_docs:
            outbreak_details.append(f"""
**{doc['title']}**
Location: {doc.get('location', 'N/A')}
Reported Cases: {doc.get('cases', 'N/A')}
Risk Level: {doc.get('risk_level', 'N/A')}
Details: {doc['content']}
Source: {doc['source']}
Last Updated: {doc.get('published_at', 'N/A')}
""")
        
        outbreak_context = "\n\n---\n\n".join(outbreak_details)
        
        # Enhanced prompt - answer from outbreak data AND note that admin can provide more context
        prompt = f"""You are a disease outbreak information assistant. Answer the user's question using the published outbreak data provided below.

PUBLISHED OUTBREAK RECORDS:
{outbreak_context}

USER QUESTION: {question}

INSTRUCTIONS:
1. Start with a brief answer to the user's question
2. ALWAYS include these key statistics in a clear format:
   - Location (state, district, locality)
   - Reported Cases: [exact number]
   - Active Cases: [exact number if available]
   - Deaths: [exact number]
   - Recoveries: [exact number if available]
   - Risk Level: [Low/Medium/High]
3. Then provide additional context from the description
4. If the question asks about transmission/spread/causes, explain that first, then show the statistics
5. If multiple outbreaks match, list each with its statistics
6. Be factual and precise - only state what is in the data
7. At the end, add: "An administrator may provide additional context or guidance if needed."

EXAMPLE FORMAT:
[Brief answer to the question]

**Outbreak Statistics:**
- Location: [location]
- Reported Cases: [number]
- Active Cases: [number]
- Deaths: [number]
- Risk Level: [level]

[Additional details from description]

An administrator may provide additional context or guidance if needed.

ANSWER (based on published outbreak data):"""
        
        llm_response = get_mistral_response(prompt)
        
        # If LLM fails, create a structured response from outbreak data
        if not llm_response or len(llm_response.strip()) < 20:
            answer_parts = ["**Published Outbreak Information:**\n"]
            for doc in outbreak_docs:
                answer_parts.append(f"\n**{doc['disease']} Outbreak**")
                answer_parts.append(f"\n📍 **Location:** {doc.get('location', 'N/A')}")
                answer_parts.append(f"\n📊 **Outbreak Statistics:**")
                answer_parts.append(f"   • Reported Cases: **{doc.get('cases', 'Not specified')}**")
                
                # Show active cases if available
                content = doc.get('content', '')
                if 'Active Cases:' in content:
                    active_start = content.find('Active Cases:') + len('Active Cases:')
                    active_end = content.find('\n', active_start)
                    active = content[active_start:active_end].strip()
                    if active and active != 'Not specified':
                        answer_parts.append(f"   • Active Cases: **{active}**")
                
                # Show deaths
                if doc.get('deaths') and doc.get('deaths') != 'Not specified':
                    answer_parts.append(f"   • Deaths: **{doc.get('deaths')}**")
                
                # Show recoveries if available
                if 'Recoveries:' in content:
                    recov_start = content.find('Recoveries:') + len('Recoveries:')
                    recov_end = content.find('\n', recov_start)
                    recov = content[recov_start:recov_end].strip()
                    if recov and recov != 'Not specified':
                        answer_parts.append(f"   • Recoveries: **{recov}**")
                
                # Show risk level
                if doc.get('risk_level'):
                    answer_parts.append(f"   • Risk Level: **{doc.get('risk_level')}**")
                
                # Extract and show description
                if 'Description:' in content:
                    desc_start = content.find('Description:') + len('Description:')
                    desc_end = content.find('\n\n', desc_start)
                    if desc_end == -1:
                        desc_end = content.find('\nSource:', desc_start)
                    description = content[desc_start:desc_end].strip()
                    if description and description != 'Not specified':
                        answer_parts.append(f"\n📝 **Details:** {description}")
                
                answer_parts.append(f"\n🕐 **Last Updated:** {doc.get('published_at', 'N/A')}")
                answer_parts.append("")
            
            answer_parts.append("💬 An administrator may provide additional context or guidance if needed.")
            answer = "\n".join(answer_parts)
        else:
            answer = llm_response.strip()
            # Ensure admin note is added if not present
            if "administrator" not in answer.lower():
                answer += "\n\n💬 An administrator may provide additional context or guidance if needed."

        return {
            "answer": answer, 
            "sources": sources, 
            "grounded": True,
            "has_outbreak_data": True,
            "outbreak_count": len(outbreak_docs)
        }

    def get_around(self, region: Optional[str] = None, category: Optional[str] = None, timeframe: str = "7", limit: int = 6) -> Dict[str, Any]:
        timeframe_days = {"today": 1, "7": 7, "30": 30, "all": 365}.get(str(timeframe).lower(), 7)
        items = self.search(query="public health environmental alerts", region=region, category=category, timeframe_days=timeframe_days, limit=limit)
        if not items:
            return {"items": []}

        cards = []
        for item in items:
            title = item.get("title") or "Health update"
            summary = item.get("content") or item.get("summary") or "Relevant public-health guidance for your region."
            source = item.get("source") or "Trusted source"
            location = item.get("location") or item.get("geography") or region or "India"
            freshness = self._freshness_label(item.get("published_at"))
            cards.append({
                "id": item.get("id") or title,
                "title": title,
                "summary": summary[:220],
                "category": (item.get("category") or "health").lower(),
                "location": location,
                "published_at": item.get("published_at") or datetime.utcnow().isoformat(),
                "source": source,
                "source_url": item.get("source_url") or "https://www.who.int/",
                "why_it_matters": (
                    "This update is relevant because your current context includes environmental or regional health factors; "
                    "it adds situational awareness without changing the calculated risk score."
                ),
                "relevance_score": round(float(item.get("relevance_score", 0.0) or 0.0), 4),
                "freshness": freshness,
                "source_credibility": "High credibility" if float(item.get("credibility", 0.0) or 0.0) >= 0.9 else "Trusted source",
            })
        return {"items": cards}
