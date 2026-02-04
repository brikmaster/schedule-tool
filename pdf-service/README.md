# PDF Service

Python microservice for extracting game schedules from PDF files.

## Setup

```bash
cd pdf-service
pip install -r requirements.txt
python pdf_service.py
```

Service runs on http://localhost:8001

## API Documentation

Once running, visit http://localhost:8001/docs for interactive API documentation.

## Endpoints

- `POST /extract` - Extract schedule from PDF file
  - Accepts: PDF file up to 10MB
  - Returns: JSON with games array and metadata

## Supported PDF Types

1. **MaxPreps-style PDFs** - Single-team printable schedules with @ notation
2. **Table-based PDFs** - League-wide schedules in table format

## Development

The service uses:
- FastAPI for the web framework
- pdfplumber for PDF text extraction
- Regex patterns for MaxPreps schedule parsing
- Table extraction as fallback method
