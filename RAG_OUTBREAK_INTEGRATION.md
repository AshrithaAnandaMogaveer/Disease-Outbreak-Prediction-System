# RAG Integration with Published Outbreaks

## Overview
The system now uses **Retrieval Augmented Generation (RAG)** to answer user information requests by querying published outbreak data along with trusted health documents.

## How It Works

### User Flow
1. User asks a question about a disease or outbreak (e.g., "Tell me about Dengue cases in Maharashtra")
2. System searches **published outbreak records** for relevant data
3. System also searches **trusted health documents** (WHO, CDC, etc.)
4. Combines both sources and uses AI to generate a comprehensive answer
5. If outbreak data found → User gets **immediate AI-powered answer**
6. If no relevant data found → Request goes to **admin for manual response**

### RAG Process

```
User Question
    ↓
Extract Keywords (disease, location)
    ↓
Query Published Outbreaks (last 90 days)
    ├── Filter by disease (if mentioned)
    ├── Filter by state/region (if mentioned)
    └── Order by recency
    ↓
Query Trusted Documents (WHO, CDC, etc.)
    ↓
Combine & Rank Results
    ├── Outbreak data (high priority)
    ├── Health documents (medium priority)
    └── Calculate relevance scores
    ↓
Generate AI Answer
    ├── Uses LLM (Mistral AI)
    ├── Cites specific outbreaks
    └── Provides factual data
    ↓
Return to User
    ├── Answer text
    ├── Source citations
    └── Outbreak details
```

## Features Implemented

### 1. Outbreak Data Retrieval
**Function**: `_get_published_outbreaks_as_documents()`

**What it does**:
- Queries `published_outbreak_records` table
- Filters by disease name (dengue, malaria, cholera, etc.)
- Filters by state/region if specified
- Returns outbreaks from last 90 days
- Formats data as RAG documents

**Data Included**:
- Disease name
- Location (state, district, locality)
- Reported cases
- Active cases
- Recoveries
- Deaths
- Risk level
- Description
- Source information
- Last updated date

### 2. Enhanced Search
**Function**: `search()`

**Improvements**:
- Combines outbreak data with health documents
- Prioritizes outbreak data (credibility: 0.95)
- Uses semantic similarity for relevance
- Returns top 5 most relevant results

**Ranking Factors**:
- Semantic similarity (35%)
- Region match (25%)
- Category match (20%)
- Keyword match (20%)
- Freshness (10%)
- Credibility (10%)

### 3. Smart Answer Generation
**Function**: `answer_question()`

**Enhanced Features**:
- Detects if outbreak data is available
- Uses specialized prompt for outbreak queries
- Cites specific outbreak cases
- Provides detailed statistics
- Falls back to admin if no data found

**Answer Types**:

**With Outbreak Data**:
```
"Based on recent outbreak records:

Dengue outbreak in Andheri, Mumbai, Maharashtra
- Reported Cases: 250
- Active Cases: Currently being monitored
- Deaths: 2
- Risk Level: Medium
- Last Updated: 2026-10-10

Description: Multiple fever cases reported in the area with mosquito breeding sites identified. 
Currently 10 people are dead.

Source: User-submitted report (admin verified)

This information is based on official health records last updated on 2026-10-10."
```

**Without Outbreak Data**:
```
"I couldn't find recent outbreak records for your query. An administrator will review your 
question and provide a personalized response."
```

## Implementation Details

### File Modified
`backend/app/rag/service.py`

### New Imports
```python
from app.models.published_outbreak import PublishedOutbreakRecord
```

### Key Changes

#### 1. Added Outbreak Query Function
```python
def _get_published_outbreaks_as_documents(self, query: str, region: Optional[str] = None):
    """Retrieve published outbreak records and format them as RAG documents."""
    # Filters by:
    # - Publication status = "published"
    # - Disease name (extracted from query)
    # - Region/State (if provided)
    # - Recent outbreaks (last 90 days)
```

#### 2. Enhanced Search Function
```python
def search(self, query: str, ...):
    # Step 1: Get outbreak data
    outbreak_docs = self._get_published_outbreaks_as_documents(query, region=region)
    
    # Step 2: Get regular documents
    documents = self.db.query(RAGDocument).filter(...).all()
    
    # Step 3: Combine both
    all_docs = outbreak_docs + candidate_docs
    
    # Step 4: Calculate relevance
    # Step 5: Return top results
```

#### 3. Improved Answer Generation
```python
def answer_question(self, question: str, ...):
    # Check if outbreak data available
    outbreak_docs = [doc for doc in documents if doc.get("category") == "outbreak_data"]
    has_outbreak_data = len(outbreak_docs) > 0
    
    if has_outbreak_data:
        # Use specialized prompt with outbreak context
        prompt = f"""You are a health information assistant. 
        Answer using ONLY the outbreak data provided...
        
        OUTBREAK DATA:
        {outbreak_context}
        ..."""
    
    # Generate AI response
    llm_response = get_mistral_response(prompt)
```

## Configuration

### Disease Keywords Detected
```python
disease_keywords = [
    "dengue", "malaria", "cholera", "typhoid", "chikungunya", 
    "plague", "tuberculosis", "covid", "hepatitis", 
    "japanese encephalitis", "leptospirosis"
]
```

### Time Window
- **Outbreak Data**: Last 90 days
- **Health Documents**: Configurable (default: 30 days)

### Result Limits
- **Search Results**: Top 5 documents
- **Outbreak Records**: Top 10 per query
- **Sources Shown**: All relevant sources

## Example Queries

### Query 1: General Disease Question
**User**: "What are the symptoms of Dengue?"

**Response**:
- Searches outbreak data for Dengue
- Searches health documents for Dengue info
- Returns symptoms from WHO/CDC documents
- Lists any active Dengue outbreaks

### Query 2: Location-Specific Question
**User**: "Are there any disease outbreaks in Maharashtra?"

**Response**:
- Searches outbreaks in Maharashtra state
- Returns all published outbreaks
- Provides statistics per disease
- Cites official sources

### Query 3: Specific Outbreak Query
**User**: "Tell me about Dengue in Mumbai"

**Response**:
- Filters: disease=Dengue, state=Maharashtra, district=Mumbai
- Returns matching outbreak records
- Provides case counts, risk level
- Shows last update date

### Query 4: No Data Available
**User**: "What about Zika virus in Delhi?"

**Response**:
- Searches outbreak records → No results
- Searches health documents → Maybe general info
- If no relevant info: "Admin will review your question"
- Request status → "awaiting_admin"

## Admin Fallback

When RAG cannot answer:

**Trigger Conditions**:
- No outbreak data found
- No relevant health documents
- Question requires specific expertise
- Data insufficient or outdated

**What Happens**:
1. Request status set to `awaiting_admin`
2. Admin receives notification
3. Admin reviews and responds manually
4. User gets notification when admin replies

## Response Structure

```json
{
  "answer": "Generated answer text with outbreak details",
  "sources": [
    {
      "title": "Dengue outbreak in Mumbai, Maharashtra",
      "source": "Official health records",
      "url": "N/A",
      "published_date": "2026-10-10T12:00:00",
      "category": "outbreak_data"
    }
  ],
  "grounded": true,
  "has_outbreak_data": true,
  "outbreak_count": 1
}
```

## Benefits

### For Users
✅ **Instant Answers**: Get immediate responses for outbreak queries
✅ **Accurate Data**: Based on official published outbreak records
✅ **Source Citations**: See exactly where information comes from
✅ **Real-time Updates**: Access latest outbreak data (within 90 days)
✅ **Comprehensive**: Combines outbreak data + health guidance

### For Admins
✅ **Reduced Workload**: RAG handles routine questions automatically
✅ **Focus on Complex Cases**: Only review questions RAG can't answer
✅ **Quality Control**: RAG never invents facts, cites sources
✅ **Audit Trail**: All responses include source citations

### For System
✅ **Scalable**: Handles unlimited queries without admin intervention
✅ **Accurate**: Uses only verified published data
✅ **Maintainable**: Auto-updates as new outbreaks are published
✅ **Extensible**: Easy to add more data sources

## Testing

### Test Scenario 1: Ask About Published Outbreak
1. Admin publishes "Dengue outbreak in Mumbai"
2. User asks "Tell me about Dengue in Mumbai"
3. ✅ RAG finds the outbreak record
4. ✅ AI generates answer with specific details
5. ✅ User gets immediate response
6. ✅ Status: "rag_answered"

### Test Scenario 2: Ask About Non-Existent Outbreak
1. User asks "What about Ebola in India?"
2. ✅ RAG searches outbreak records → None found
3. ✅ RAG searches health docs → Maybe general info
4. ✅ If insufficient: Request goes to admin
5. ✅ Status: "awaiting_admin"

### Test Scenario 3: Location-Based Query
1. Admin publishes 3 outbreaks in Maharashtra
2. User asks "What outbreaks are in Maharashtra?"
3. ✅ RAG finds all 3 outbreak records
4. ✅ AI generates summary of all outbreaks
5. ✅ User sees comprehensive list
6. ✅ Status: "rag_answered"

## Monitoring

### Check if RAG is Working
1. Submit test question via "Request Information"
2. Check request status:
   - `rag_answered` = RAG successfully answered
   - `awaiting_admin` = RAG couldn't answer, needs admin

### View RAG Response
```json
{
  "id": "request_id",
  "question": "User's question",
  "rag_answer": "AI-generated answer or null",
  "rag_sources": "[{source data}]",
  "rag_grounded": "true" or "false",
  "status": "rag_answered" or "awaiting_admin"
}
```

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice input for questions
- [ ] Trending outbreak analysis
- [ ] Predictive insights
- [ ] Export outbreak reports
- [ ] Email notifications
- [ ] Mobile push notifications
- [ ] Interactive outbreak maps

---
**Status**: ✅ Active  
**Version**: 2.0  
**Last Updated**: 2024-03-21  
**Integration**: RAG + Published Outbreaks + LLM
