import os
import tempfile
import json
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from github.router import router as github_router
import sys
from pathlib import Path

# Add parsers directory to path
sys.path.insert(0, str(Path(__file__).parent / "parsers"))

try:
    from cvParser import CVParser
except ImportError as e:
    print(f"Error importing CVParser: {e}")
    CVParser = None

app = FastAPI(
    title="AegisHire CV Parser API",
    description="API for parsing CV documents and extracting structured information",
    version="1.0.0"
)
app.include_router(github_router)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    """Serve the HTML upload interface"""
    html_file = Path(__file__).parent / "upload.html"
    if html_file.exists():
        return FileResponse(html_file, media_type="text/html")
    return {
        "message": "CV Parser API",
        "version": "1.0.0",
        "docs": "/docs",
        "upload": "Open /upload.html"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/parse-cv")
async def parse_cv(file: UploadFile = File(...)):
    """
    Upload a CV file (PDF or image) and get parsed structured data.
    
    - Accepts: PDF, PNG, JPG, JPEG, BMP, TIFF, GIF
    - Returns: Structured CV data (name, contact, skills, education, work experience, etc.)
    """
    tmp_path = None
    try:
        # Check if CVParser is available
        if CVParser is None:
            return JSONResponse(
                status_code=500,
                content={"error": "CVParser not available. Check server logs."}
            )
        
        # Validate file type
        allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif"}
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unsupported file type: {file_ext}. Allowed types: {', '.join(allowed_extensions)}"}
            )
        
        # Save uploaded file to temporary location
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
        tmp_path = tmp_file.name
        
        contents = await file.read()
        tmp_file.write(contents)
        tmp_file.flush()
        tmp_file.close()
        
        print(f"Processing file: {file.filename}")
        
        # Extract text from PDF/image
        text = CVParser.extract_text_from_pdf(tmp_path, use_ocr=True)
        
        if not text.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "No text could be extracted from the uploaded file"}
            )
        
        print(f"Extracted text length: {len(text)}")
        
        # Determine if AI parsing is available
        use_ai = bool(os.getenv("GROQ_API_KEY"))
        print(f"Using AI parsing: {use_ai}")
        
        # Parse CV
        parser = CVParser(text, use_ai=use_ai)
        cv = parser.parse()
        
        result = {
            "success": True,
            "cv": cv.to_dict(),
            "parsing_mode": "AI" if use_ai else "Regex",
            "filename": file.filename
        }
        
        return JSONResponse(status_code=200, content=result)
        
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"Error processing file: {error_msg}")
        print(f"Traceback: {error_trace}")
        
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Error processing file: {error_msg}",
                "details": error_trace
            }
        )
    finally:
        # Clean up temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as e:
                print(f"Error cleaning up temp file: {e}")
