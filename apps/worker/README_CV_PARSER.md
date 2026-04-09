# CV Parser with Groq/Claude Integration

This improved CV parser uses Claude via Groq's API for intelligent, accurate extraction of CV information instead of fragile regex patterns.

## Setup

### 1. Install Dependencies
```bash
pip install -e .
```

Or manually:
```bash
pip install groq PyMuPDF python-dotenv
```

### 2. Get Your Groq API Key
1. Go to https://console.groq.com/keys
2. Create a new API key
3. Copy the key

### 3. Configure the Key
Create a `.env` file in the worker directory:
```
GROQ_API_KEY=your_api_key_here
```

**Important:** Never commit `.env` to git. It's already in `.gitignore`.

## Usage

### Command Line
```bash
# Using a specific CV file
python cvParser.py /path/to/cv.pdf

# Using default path
python cvParser.py
```

### Programmatically
```python
from cvParser import CVParser

# With AI parsing (requires GROQ_API_KEY)
parser = CVParser(cv_text, use_ai=True)
cv = parser.parse()

# Or fallback to regex if AI unavailable
parser = CVParser(cv_text, use_ai=False)
cv = parser.parse()
```

## How It Works

### AI Mode (Default)
- Sends CV text to Claude via Groq API
- Claude extracts structured information accurately
- Handles various CV formats automatically
- Returns JSON with all fields

### Regex Mode (Fallback)
- Used when `GROQ_API_KEY` is not set
- Falls back automatically if AI fails
- Less accurate but doesn't require API key

## Output Format

```json
{
  "name": "John Doe",
  "title": "Senior Software Engineer",
  "profile": "...",
  "contact": {
    "phone": "+1 234 567 8900",
    "email": "john@example.com",
    "location": "San Francisco, USA",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "skills": {
    "Technical": ["Python", "TypeScript", "..."],
    "Soft Skills": ["Leadership", "..."]
  },
  "languages": ["English: Native", "Spanish: Fluent"],
  "education": [
    {
      "degree": "BS Computer Science",
      "institution": "MIT",
      "duration": "2015-2019",
      "details": ["GPA: 3.8", "..."]
    }
  ],
  "work_experience": [
    {
      "company": "Tech Corp",
      "position": "Senior Engineer",
      "duration": "Jan 2020 - Present",
      "responsibilities": ["Led team of 5", "..."]
    }
  ]
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
