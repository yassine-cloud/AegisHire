# CV Parser API Integration Guide

The CV Parser is a FastAPI service that extracts and structures information from CV documents (PDF and images). This guide explains how to integrate it into your project.

## Quick Start

### 1. Setup the Service

**Prerequisites:**
- Python 3.11+
- `uv` package manager (or `pip`)

**Start the service:**
```bash
cd apps/worker
uv run fastapi dev
```

The API will be available at `http://localhost:8000`

### 2. Configure Environment (Optional but Recommended)

For better parsing accuracy, set up the Groq API key:

1. Get your key from https://console.groq.com/keys
2. Create `.env` in `apps/worker/`:
```
GROQ_API_KEY=your_api_key_here
```

**Without the key:** The service falls back to regex parsing (less accurate but still functional)

---

## API Endpoints

### **GET /health**
Check if the service is running.

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy"
}
```

---

### **POST /parse-cv**
Upload a CV file and get parsed structured data.

**Supported Formats:** PDF, PNG, JPG, JPEG, BMP, TIFF, GIF

**Request:**
```bash
curl -X POST "http://localhost:8000/parse-cv" \
  -F "file=@/path/to/cv.pdf"
```

**Response:**
```json
{
  "success": true,
  "parsing_mode": "AI",
  "filename": "cv.pdf",
  "cv": {
    "name": "John Doe",
    "title": "Senior Software Engineer",
    "profile": "Experienced engineer with 10 years in tech...",
    "contact": {
      "phone": "+1 234 567 8900",
      "email": "john@example.com",
      "location": "San Francisco, USA",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "skills": {
      "Technical": ["Python", "TypeScript", "React"],
      "Tools": ["Docker", "Kubernetes"]
    },
    "languages": ["English: Native", "Spanish: Fluent"],
    "education": [
      {
        "degree": "BS Computer Science",
        "institution": "MIT",
        "duration": "2015-2019",
        "details": ["GPA: 3.8", "Dean's List"]
      }
    ],
    "work_experience": [
      {
        "company": "Tech Corp",
        "position": "Senior Engineer",
        "duration": "Jan 2020 - Present",
        "responsibilities": ["Led team of 5", "Designed microservices"]
      }
    ]
  }
}
```

---

## Integration Examples

### JavaScript/TypeScript (Frontend)

```typescript
const file = document.getElementById('fileInput').files[0];
const formData = new FormData();
formData.append('file', file);

const response = await fetch('http://localhost:8000/parse-cv', {
  method: 'POST',
  body: formData
});

const data = await response.json();
const cv = data.cv;

console.log(`Name: ${cv.name}`);
console.log(`Email: ${cv.contact.email}`);
console.log(`Skills: ${JSON.stringify(cv.skills)}`);
```

### Python

```python
import requests

with open('cv.pdf', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:8000/parse-cv', files=files)
    
data = response.json()
cv = data['cv']

print(f"Name: {cv['name']}")
print(f"Email: {cv['contact']['email']}")
print(f"Skills: {cv['skills']}")
```

### Node.js/Express

```javascript
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const form = new FormData();
form.append('file', fs.createReadStream('cv.pdf'));

const response = await axios.post(
  'http://localhost:8000/parse-cv',
  form,
  { headers: form.getHeaders() }
);

const cv = response.data.cv;
console.log(`Name: ${cv.name}`);
console.log(`Email: ${cv.contact.email}`);
```

### cURL

```bash
curl -X POST "http://localhost:8000/parse-cv" \
  -F "file=@cv.pdf"
```

---

## Response Structure

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether parsing succeeded |
| `parsing_mode` | string | `"AI"` or `"Regex"` (depending on API key) |
| `filename` | string | Original uploaded filename |
| `cv` | object | Parsed CV data |

### CV Object Fields

#### `contact`
```json
{
  "phone": "string or null",
  "email": "string or null",
  "location": "string or null",
  "linkedin": "string or null"
}
```

#### `skills`
```json
{
  "Technical": ["skill1", "skill2"],
  "Tools": ["tool1", "tool2"],
  ...
}
```

#### `education` (array)
```json
{
  "degree": "BS Computer Science",
  "institution": "MIT",
  "duration": "2015-2019",
  "details": ["Additional info"]
}
```

#### `work_experience` (array)
```json
{
  "company": "Tech Corp",
  "position": "Engineer",
  "duration": "Jan 2020 - Present",
  "responsibilities": ["Responsibility 1", "Responsibility 2"]
}
```

---

## Error Handling

### Invalid File Type
**Status:** 400
```json
{
  "error": "Unsupported file type: .docx. Allowed types: .pdf, .png, .jpg, .jpeg, .bmp, .tiff, .gif"
}
```

### No Text Extracted
**Status:** 400
```json
{
  "error": "No text could be extracted from the uploaded file"
}
```

### Server Error
**Status:** 500
```json
{
  "error": "Error processing file: description",
  "details": "Full traceback"
}
```

---

## Deployment

### Docker

Create a `Dockerfile` in `apps/worker/`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install -e .

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t cv-parser .
docker run -p 8000:8000 -e GROQ_API_KEY=your_key cv-parser
```

### Environment Variables

Set these when deploying:
- `GROQ_API_KEY` - (Optional) Groq API key for AI parsing
- `PORT` - (Optional) Server port (default: 8000)

---

## Troubleshooting

### Service Not Responding
```bash
curl http://localhost:8000/health
```

### API Key Not Working
- Verify key is set: `echo $GROQ_API_KEY`
- Check key validity at https://console.groq.com/keys
- Service falls back to regex if key fails

### File Upload Errors
- Check file size (very large files may timeout)
- Verify file format is supported
- Ensure file isn't corrupted

### PDF Parsing Issues
For image-based PDFs, ensure Tesseract OCR is installed:
```bash
# Windows: Download installer from https://github.com/UB-Mannheim/tesseract/wiki
# Mac: brew install tesseract
# Linux: sudo apt-get install tesseract-ocr
```

---

## Performance

- **Average response time:** 2-5 seconds (with AI) / <1 second (regex)
- **File size limit:** Configurable (default: 25MB)
- **Concurrent requests:** Limited by server resources

---

## Documentation

- OpenAPI/Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- HTML UI: `http://localhost:8000/`
}
```

## Performance

- AI mode: 2-5 seconds per CV (including API latency)
- Regex mode: <100ms per CV
- Groq API is fast and affordable

## Troubleshooting

**"GROQ_API_KEY not set"**
- Create `.env` file with your API key
- Or set environment variable: `export GROQ_API_KEY=your_key`

**"Failed to parse AI response as JSON"**
- The API response was invalid JSON
- Parser automatically falls back to regex mode
- Try again or use regex mode explicitly

**"PDF extraction failed"**
- Some PDFs have unusual formatting
- Try opening the PDF in a PDF reader first
- Consider using an alternative PDF library
