# AI Service Integration - Setup Guide

## Quick Start

### 1. Install OpenAI SDK

```bash
pip install openai
```

### 2. Set Environment Variable

Add to your `.env` file (create if it doesn't exist):

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4
```

**Get your API key**: https://platform.openai.com/api-keys

### 3. Test the Integration

Upload a book via Swagger UI:

1. Go to http://localhost:8000/docs
2. Find `POST /interactive-books/upload`
3. Upload a PDF file
4. Set `trigger_ai=true` (default)
5. Check processing status at `GET /interactive-books/{book_id}/processing-status`

---

## How It Works

### Upload Flow

```
1. Teacher uploads PDF → Book record created (status: pending)
2. Background task triggered → AI processing starts (status: processing)
3. Text extracted from PDF → Sent to OpenAI
4. AI segments book into units → Unit records created
5. AI generates exercises per unit → Exercise records created
6. Processing complete → Book status: completed, needs_review: true
7. Teacher reviews AI content → Makes corrections
8. Teacher publishes book → Students can access
```

### API Endpoints

**Upload Book (with AI)**
```http
POST /interactive-books/upload
Content-Type: multipart/form-data

title: "Biology Textbook"
file: [PDF file]
trigger_ai: true
```

**Check Processing Status**
```http
GET /interactive-books/{book_id}/processing-status

Response:
{
  "processing_status": "completed",
  "ai_model_used": "gpt-4",
  "ai_processing_cost": 0.15,
  "overall_confidence": 85.5,
  "statistics": {
    "total_units": 12,
    "total_exercises": 96,
    "exercises_needing_review": 96
  }
}
```

**Manually Trigger AI Processing**
```http
POST /interactive-books/{book_id}/process-with-ai
```

**Get Items Needing Review**
```http
GET /interactive-books/needs-review
```

---

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4` | Model to use (gpt-4, gpt-3.5-turbo) |
| `OPENAI_TEMPERATURE` | `0.3` | Sampling temperature (0-1) |
| `OPENAI_MAX_TOKENS` | `4000` | Max tokens per request |

### Cost Estimation

**GPT-4 Pricing** (as of 2024):
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens

**Typical Book Processing**:
- 200-page textbook: ~$0.50 - $2.00
- Depends on: book length, complexity, number of exercises

**Cost is tracked** in `Book.ai_processing_cost` and `AIProcessingLog.cost_usd`

---

## Teacher Review Workflow

### 1. View Books Needing Review

```http
GET /interactive-books?processing_status=completed
```

Filter for books with `needs_manual_review=true`

### 2. Review AI-Generated Content

```http
GET /interactive-books/{book_id}
GET /interactive-books/{book_id}/units
GET /interactive-books/units/{unit_id}/exercises
```

### 3. Get Items Flagged for Review

```http
GET /interactive-books/needs-review
```

Returns exercises with `needs_review=true`, sorted by confidence (lowest first)

### 4. Make Corrections

```http
PUT /interactive-books/exercises/{exercise_id}
{
  "question_text": "Corrected question...",
  "correct_answer": "B",
  "explanation": "Updated explanation..."
}
```

### 5. Submit Review

```http
POST /interactive-books/exercises/{exercise_id}/review
{
  "review_type": "exercise",
  "action": "corrected",
  "corrected_data": {...},
  "quality_rating": 4,
  "review_notes": "Fixed answer and added better explanation"
}
```

### 6. Publish Book

```http
PUT /interactive-books/{book_id}/publish
```

---

## Error Handling

### AI Processing Failures

If AI processing fails:
- Book status set to `needs_review`
- Error logged in `AIProcessingLog`
- Teacher notified via `needs_manual_review=true`

### Common Issues

**1. OpenAI API Key Not Set**
```
Error: OpenAI client not initialized
Solution: Set OPENAI_API_KEY in .env file
```

**2. Rate Limit Exceeded**
```
Error: Rate limit exceeded
Solution: Wait and retry, or upgrade OpenAI plan
```

**3. Text Extraction Failed**
```
Status: needs_review
Solution: Check if PDF is scanned (OCR needed) or corrupted
```

---

## Testing Locally

### 1. Simple Test

```python
# Test AI service directly
from app.services.ai_service import create_ai_service

ai_service = create_ai_service()

# Test unit segmentation
result, metadata = ai_service.segment_book_into_units(
    book_text="Chapter 1: Introduction...",
    total_pages=100,
    book_title="Test Book"
)

print(f"Units detected: {result.total_units}")
print(f"Cost: ${metadata['cost_usd']:.4f}")
```

### 2. Full Integration Test

```bash
# 1. Upload a sample PDF
curl -X POST "http://localhost:8000/interactive-books/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Sample Book" \
  -F "file=@sample.pdf" \
  -F "trigger_ai=true"

# 2. Check status (wait 30-60 seconds)
curl "http://localhost:8000/interactive-books/1/processing-status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. View generated units
curl "http://localhost:8000/interactive-books/1/units" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Monitoring & Logs

### View AI Processing Logs

```http
GET /interactive-books/ai-logs/{book_id}
```

Returns:
- Job ID
- Operation type
- Tokens used
- Cost
- Confidence scores
- Errors (if any)

### Check Server Logs

```bash
# Look for AI processing messages
tail -f logs/app.log | grep "AI processing"
```

Expected output:
```
INFO: Starting AI processing for book: Biology (ID: 1)
INFO: Step 1: Extracting text from book file
INFO: Text extracted: 45000 characters, 200 pages
INFO: Step 2: Segmenting book into units with AI
INFO: Units detected: 12
INFO: Step 3: Creating unit records in database
INFO: Step 4: Generating exercises for each unit
INFO: Created 8 exercises for unit 1
...
INFO: ✅ AI processing completed successfully for book 1
INFO:    - Units created: 12
INFO:    - Exercises created: 96
INFO:    - Tokens used: 15000
INFO:    - Cost: $0.68
```

---

## Next Steps

1. ✅ Set OPENAI_API_KEY in .env
2. ✅ Upload a test book
3. ✅ Monitor processing status
4. ✅ Review AI-generated content
5. ✅ Make corrections as needed
6. ✅ Publish book for students

## Support

For issues:
- Check server logs for detailed error messages
- Verify OpenAI API key is valid
- Ensure sufficient OpenAI credits
- Check book file is valid PDF/DOCX
