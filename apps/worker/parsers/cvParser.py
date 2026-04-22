import sys
import os
import json
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

try:
    from dotenv import load_dotenv
    # Load .env file from the apps directory if present
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:
    print(
        "Module 'fitz' not found or the wrong 'fitz' package is installed.\n"
        "Fix: run:\n  python -m pip uninstall -y fitz\n  python -m pip install PyMuPDF"
    )
    raise

try:
    from groq import Groq
except ModuleNotFoundError:
    print(
        "Module 'groq' not found.\n"
        "Fix: run:\n  python -m pip install groq"
    )
    raise

try:
    import pytesseract
    from PIL import Image
    import io
    HAS_OCR = True
except ModuleNotFoundError:
    print(
        "Warning: OCR modules not found (pytesseract/PIL). Image-based PDF parsing will be unavailable.\n"
        "To enable: python -m pip install pytesseract Pillow\n"
        "Also requires Tesseract OCR installed on system: https://github.com/UB-Mannheim/tesseract/wiki",
        file=sys.stderr
    )
    HAS_OCR = False


@dataclass
class ContactInfo:
    phone: str = None
    email: str = None
    location: str = None
    linkedin: str = None


@dataclass
class EducationEntry:
    degree: str
    institution: str
    duration: str = None
    details: List[str] = None


@dataclass
class WorkExperienceEntry:
    company: str
    position: str
    duration: str = None
    responsibilities: List[str] = None


@dataclass
class CV:
    name: str = None
    title: str = None
    profile: str = None
    contact: ContactInfo = None
    skills: Dict[str, List[str]] = None
    languages: List[str] = None
    education: List[EducationEntry] = None
    work_experience: List[WorkExperienceEntry] = None

    def to_json(self) -> str:
        """Convert CV to JSON string"""
        def serialize(obj):
            if hasattr(obj, '__dataclass_fields__'):
                return asdict(obj)
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

        return json.dumps(asdict(self), indent=2, default=serialize)

    def to_dict(self) -> Dict[str, Any]:
        """Convert CV to dictionary"""
        return asdict(self)


class CVParser:
    """Parse CV text and extract structured information"""

    def __init__(self, text: str, use_ai: bool = True):
        self.text = text
        self.cv = CV()
        self.use_ai = use_ai

        if use_ai:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError(
                    "GROQ_API_KEY environment variable not set. "
                    "Please set it before running the parser."
                )
            self.client = Groq(api_key=api_key)

    @staticmethod
    def extract_text_from_pdf(pdf_path: str, use_ocr: bool = True) -> str:
        """Extract text from PDF, using OCR for image-based PDFs if needed"""
        doc = fitz.open(pdf_path)
        text = ""
        
        for page_num, page in enumerate(doc):
            # Try to extract text normally first
            page_text = page.get_text()
            
            if page_text.strip():
                # Page has extractable text
                text += page_text
            elif use_ocr and HAS_OCR:
                # Page is image-based, use OCR
                print(f"Page {page_num + 1} appears to be image-based, using OCR...", file=sys.stderr)
                page_text_ocr = CVParser._extract_text_with_ocr(page)
                if page_text_ocr:
                    text += page_text_ocr
                else:
                    print(f"Warning: Failed to extract text from page {page_num + 1}", file=sys.stderr)
            elif use_ocr and not HAS_OCR:
                print(
                    f"Page {page_num + 1} is image-based but OCR is not available. "
                    "Install pytesseract and Tesseract OCR to parse image-based PDFs.",
                    file=sys.stderr
                )
        
        doc.close()
        return text

    @staticmethod
    def _extract_text_with_ocr(page) -> str:
        """Extract text from a PDF page using OCR (Tesseract)"""
        if not HAS_OCR:
            return ""
        
        try:
            # Render page to image
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
            img_data = pix.tobytes("ppm")
            img = Image.open(io.BytesIO(img_data))
            
            # Perform OCR
            text = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            print(f"OCR extraction failed: {e}", file=sys.stderr)
            return ""

    def parse(self) -> CV:
        """Main parsing method - uses AI by default"""
        if self.use_ai:
            return self._parse_with_ai()
        else:
            return self._parse_with_regex()

    def _parse_with_ai(self) -> CV:
        """Parse CV using Llama via Groq API"""
        prompt = f"""Extract structured information from this CV text and return valid JSON only (no markdown, no extra text).

CV Text:
{self.text}

Return a JSON object with this exact structure:
{{
  "name": "string or null",
  "title": "string or null",
  "profile": "string or null",
  "contact": {{
    "phone": "string or null",
    "email": "string or null",
    "location": "string or null",
    "linkedin": "string or null"
  }},
  "skills": {{"category": ["skill1", "skill2"]}} or null,
  "languages": ["language1: level"] or null,
  "education": [
    {{"degree": "string", "institution": "string", "duration": "string or null", "details": ["string"] or null}}
  ] or null,
  "work_experience": [
    {{"company": "string", "position": "string", "duration": "string or null", "responsibilities": ["string"] or null}}
  ] or null
}}

Rules:
- Extract ALL skills organized by category (Technical, Soft Skills, Programming Languages, Tools, etc.)
- For work experience, extract all responsibilities as separate bullet points
- For education, capture any details/coursework mentioned
- Keep durations in original format (e.g., "Jan 2020 - Dec 2022")
- Return only valid JSON, no additional text"""

        try:
            message = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",  # Updated from deprecated mixtral-8x7b-32768
                max_tokens=2048,
                response_format={"type": "json_object"},  # Forces clean JSON output, no markdown fences
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            response_text = message.choices[0].message.content.strip()

            # Safety net: strip markdown fences if somehow present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            data = json.loads(response_text)

            # Map JSON data to CV object
            self.cv.name = data.get("name")
            self.cv.title = data.get("title")
            self.cv.profile = data.get("profile")

            if data.get("contact"):
                self.cv.contact = ContactInfo(**data["contact"])

            self.cv.skills = data.get("skills")
            self.cv.languages = data.get("languages")

            if data.get("education"):
                self.cv.education = [
                    EducationEntry(**edu) for edu in data["education"]
                ]

            if data.get("work_experience"):
                self.cv.work_experience = [
                    WorkExperienceEntry(**exp) for exp in data["work_experience"]
                ]

            return self.cv

        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}", file=sys.stderr)
            print(f"Response was: {response_text}", file=sys.stderr)
            # Fallback to regex parsing
            return self._parse_with_regex()
        except Exception as e:
            print(f"AI parsing failed: {e}", file=sys.stderr)
            # Fallback to regex parsing
            return self._parse_with_regex()

    def _parse_with_regex(self) -> CV:
        """Fallback regex-based parsing"""
        self.extract_contact_info()
        self.extract_name_and_title()
        self.extract_profile()
        self.extract_skills()
        self.extract_languages()
        self.extract_education()
        self.extract_work_experience()
        return self.cv

    def extract_contact_info(self):
        """Extract phone, email, location, linkedin"""
        contact = ContactInfo()

        # Phone pattern: +XXX XX XXX XXX
        phone_match = re.search(r'\+?\d[\d\s]{7,}', self.text)
        if phone_match:
            contact.phone = phone_match.group(0).strip()

        # Email pattern
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', self.text)
        if email_match:
            contact.email = email_match.group(0)

        # LinkedIn pattern
        linkedin_match = re.search(r'https://www\.linkedin\.com/in/[\w\-/]+', self.text)
        if linkedin_match:
            contact.linkedin = linkedin_match.group(0)

        # Location - usually appears with city, country format
        location_match = re.search(r'([A-Z][a-z]+),\s*([A-Z][a-z]+)', self.text)
        if location_match:
            contact.location = f"{location_match.group(1)}, {location_match.group(2)}"

        self.cv.contact = contact

    def extract_name_and_title(self):
        """Extract name and professional title"""
        lines = self.text.split('\n')

        # Usually name is one of the first lines (all caps or normal case)
        for i, line in enumerate(lines[:10]):
            line = line.strip()
            if line and len(line) > 3 and not any(keyword in line.upper() for keyword in ['SKILLS', 'CONTACT', 'EMAIL']):
                # Check if line has multiple capital letters (likely a name)
                if sum(1 for c in line if c.isupper()) > 2:
                    self.cv.name = line
                    # Title often follows name
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        if next_line and len(next_line) > 5:
                            self.cv.title = next_line
                    break

    def extract_profile(self):
        """Extract profile/summary section"""
        profile_match = re.search(r'(?:PROFILE|SUMMARY|ABOUT)(.*?)(?=SKILLS|EDUCATION|WORK|CONTACT)',
                                  self.text, re.DOTALL | re.IGNORECASE)
        if profile_match:
            profile_text = profile_match.group(1).strip()
            # Clean up the text
            profile_text = ' '.join(profile_text.split())[:500]  # Limit to 500 chars
            self.cv.profile = profile_text if profile_text else None

    def extract_skills(self):
        """Extract skills by category"""
        skills_match = re.search(r'SKILLS(.*?)(?=LANGUAGES|EDUCATION|CONTACT|WORK)',
                                 self.text, re.DOTALL | re.IGNORECASE)

        if not skills_match:
            self.cv.skills = {}
            return

        skills_text = skills_match.group(1)
        skills_dict = {}

        # Split by category headers or bullet points
        lines = skills_text.split('\n')
        current_category = "General"

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # If line has a colon, it's likely a category
            if ':' in line and any(keyword in line for keyword in ['Programming', 'Web', 'Computer', 'Microcontroller', 'Tools', 'Design', 'Development']):
                current_category = line.replace(':', '').strip()
                skills_dict[current_category] = []
            elif line and line[0] in ['•', '-', '*']:
                # Remove bullet point and split by comma
                skill_line = line.lstrip('•-* ').strip()
                skills = [s.strip() for s in skill_line.split(',')]
                if current_category not in skills_dict:
                    skills_dict[current_category] = []
                skills_dict[current_category].extend(skills)
            elif ':' not in line and current_category in skills_dict:
                # Continuation of current category
                skills = [s.strip() for s in line.split(',')]
                skills_dict[current_category].extend(skills)

        self.cv.skills = skills_dict

    def extract_languages(self):
        """Extract languages and proficiency levels"""
        languages_match = re.search(r'LANGUAGES?(.*?)(?=SKILLS|EDUCATION|CONTACT|WORK|$)',
                                    self.text, re.DOTALL | re.IGNORECASE)

        languages = []
        if languages_match:
            lang_text = languages_match.group(1)
            lines = lang_text.split('\n')
            for line in lines:
                line = line.strip()
                if line and line[0] not in ['•', '-', '*']:
                    continue
                line = line.lstrip('•-* ').strip()
                if line:
                    languages.append(line)

        self.cv.languages = languages if languages else None

    def extract_education(self):
        """Extract education entries"""
        education_match = re.search(r'EDUCATION(.*?)(?=WORK|EXPERIENCE|SKILLS|$)',
                                    self.text, re.DOTALL | re.IGNORECASE)

        education = []
        if education_match:
            edu_text = education_match.group(1)
            # Split by degree/institution patterns
            entries = re.split(r'\n(?=[A-Z].*(?:degree|Bachelor|Master|Engineer|Diploma))', edu_text, flags=re.IGNORECASE)

            for entry in entries:
                entry = entry.strip()
                if not entry:
                    continue

                lines = entry.split('\n')
                degree = lines[0].strip() if lines else None
                institution = lines[1].strip() if len(lines) > 1 else None
                duration = None
                details = []

                # Look for dates in the format YYYY-YYYY or MMM YYYY - MMM YYYY
                for line in lines:
                    date_match = re.search(r'\d{4}|[A-Za-z]{3}\s*\d{4}', line)
                    if date_match:
                        duration = line.strip()
                    elif line.strip() and line.strip() not in [degree, institution]:
                        details.append(line.strip())

                if degree and institution:
                    education.append(EducationEntry(
                        degree=degree,
                        institution=institution,
                        duration=duration,
                        details=details if details else None
                    ))

        self.cv.education = education if education else None

    def extract_work_experience(self):
        """Extract work experience entries"""
        work_match = re.search(r'(?:WORK\s*EXPERIENCE|EXPERIENCE)(.*?)(?=EDUCATION|SKILLS|LANGUAGES|$)',
                               self.text, re.DOTALL | re.IGNORECASE)

        work_exp = []
        if work_match:
            work_text = work_match.group(1)
            # Split entries by company names (often followed by position)
            entries = re.split(r'\n(?=[A-Z][A-Za-z\s]+(?:Inc|Ltd|Observatory|Laboratory|Ltd|Corp|Company)?(?:\n|$))', work_text)

            for entry in entries:
                entry = entry.strip()
                if not entry or len(entry) < 10:
                    continue

                lines = [l.strip() for l in entry.split('\n') if l.strip()]
                if len(lines) < 2:
                    continue

                company = lines[0]
                position = lines[1] if len(lines) > 1 else None
                duration = None
                responsibilities = []

                # Extract duration and responsibilities
                for line in lines[2:]:
                    # Check if line is a date
                    if re.search(r'\d{4}|[A-Za-z]{3}\s*\d{4}', line):
                        duration = line
                    elif line.startswith('•') or line.startswith('-'):
                        responsibilities.append(line.lstrip('•- ').strip())
                    elif line and duration:  # After duration, remaining lines are responsibilities
                        responsibilities.append(line)

                if company and position:
                    work_exp.append(WorkExperienceEntry(
                        company=company,
                        position=position,
                        duration=duration,
                        responsibilities=responsibilities if responsibilities else None
                    ))

        self.cv.work_experience = work_exp if work_exp else None



if __name__ == "__main__":
    # Allow passing the PDF path as the first argument; otherwise use the default path.
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else r"D:\users\seif\Downloads\cv4.pdf"


    if not os.path.exists(pdf_path):
        print(
            f"PDF file not found: {pdf_path!r}.\n"
            "Please provide a valid path, for example:\n  python cvParser.py D:/path/to/file.pdf"
        )
        sys.exit(1)

    # Extract text from PDF (handles both text-based and image-based PDFs)
    text = CVParser.extract_text_from_pdf(pdf_path, use_ocr=True)

    if not text.strip():
        print("Error: No text could be extracted from the PDF.", file=sys.stderr)
        sys.exit(1)

    # Check if Groq API key is available
    use_ai = bool(os.getenv("GROQ_API_KEY"))
    if not use_ai:
        print("Warning: GROQ_API_KEY not set. Using fallback regex parsing.", file=sys.stderr)

    # Parse the extracted text
    parser = CVParser(text, use_ai=use_ai)
    cv = parser.parse()

    # Output as JSON
    print(cv.to_json())