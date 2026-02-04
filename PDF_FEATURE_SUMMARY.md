# PDF Ingestion Feature - Implementation Summary

## Overview
Added PDF file support to the bulk schedule importer, allowing users to upload MaxPreps-style schedule PDFs alongside existing CSV/Excel support.

## What Was Implemented

### 1. Python PDF Extraction Service
**Location:** `/pdf-service/`

**Files Created:**
- `pdf_service.py` - FastAPI server with pdfplumber extraction
- `requirements.txt` - Python dependencies
- `README.md` - Service documentation
- `start.sh` - Startup script

**Features:**
- MaxPreps-style PDF extraction (primary method)
- Table-based PDF extraction (fallback method)
- Runs on port 8001
- Supports PDFs up to 10MB, max 200 games
- CORS enabled for Next.js API route
- Filters completed games (with W/L results)
- Returns only upcoming games for scheduling

### 2. Next.js API Route
**Location:** `/app/api/process-pdf/route.ts`

**Features:**
- Proxies PDF uploads to Python service
- Validates file type and format
- Filters to upcoming games only
- Returns metadata about skipped completed games
- Handles service unavailability gracefully

### 3. Updated Components

#### File Constants (`/lib/constants.ts`)
- Added `MAX_PDF_GAMES: 200`
- Added `MAX_PDF_SIZE_MB: 10`
- Added `MAX_PDF_SIZE_BYTES: 10 * 1024 * 1024`
- Added "application/pdf" to `ACCEPTED_TYPES`
- Added ".pdf" to `ACCEPTED_EXTENSIONS`

#### File Dropzone (`/components/ui/FileDropzone.tsx`)
- Updated validation for PDF files (10MB limit)
- Updated UI text to mention PDFs
- Added size-based validation (different limits for PDF vs CSV/Excel)

#### File Upload (`/components/steps/FileUpload.tsx`)
- Added PDF detection logic
- Added API call to `/api/process-pdf`
- Added processing status UI ("Extracting schedule from PDF...")
- Added info message for skipped completed games
- Skips directly to step 2 (Configure Defaults) for PDFs
- Maintains backward compatibility with CSV/Excel flow

#### App Context (`/contexts/AppContext.tsx`)
- Added `SET_GAMES_FROM_PDF` action
- Added `pdfMetadata` to state for tracking extraction info

#### Types (`/types/index.ts`)
- Added optional `pdfMetadata` field to `AppState`:
  ```typescript
  pdfMetadata?: {
    mainTeam: string;
    completedGamesSkipped: number;
    totalGamesInPdf: number;
  };
  ```

### 4. Environment Configuration
**Files Updated:**
- `.env.local` - Added `PDF_SERVICE_URL=http://localhost:8001`
- `.env.local.example` - Documented PDF_SERVICE_URL

### 5. Documentation
**Files Updated:**
- `README.md` - Added PDF support documentation and setup instructions

## How It Works

### Upload Flow
1. User uploads PDF file via dropzone
2. Frontend detects `.pdf` extension
3. Shows "Extracting schedule from PDF..." status
4. Sends file to `/api/process-pdf` API route
5. API route forwards to Python service at `localhost:8001/extract`
6. Python service extracts schedule data:
   - Tries MaxPreps extraction first (regex-based)
   - Falls back to table extraction if needed
   - Returns all games with `isCompleted` flag
7. API route filters to only upcoming games (`isCompleted: false`)
8. Frontend receives games array and metadata
9. Games are mapped to `GameRow` format
10. User skips column mapping, goes directly to Configure Defaults (step 2)

### MaxPreps PDF Format
```
11/25 @Fairmont Prep (Anaheim, CA) ** (W) 58 - 55
      7:00p
      Location: Fairmont Prep High School

11/30 Cathedral Catholic (San Diego, CA) * (L) 62 - 68
      7:00p
```

**Extraction Logic:**
- `@` prefix = away game (main team is visitor)
- No `@` = home game (main team is host)
- `(W) XX - XX` = win (first score is main team)
- `(L) XX - XX` = loss (first score is opponent)
- `Preview Game` = upcoming/unplayed game
- Only `Preview Game` entries are scheduled

## File Limits

| Type | Max Size | Max Games | Validation |
|------|----------|-----------|------------|
| CSV/Excel | 5MB | 1000 rows | Client + Server |
| PDF | 10MB | 200 games | Server-side |

## Testing Checklist

### Local Development
- [x] Python service starts on port 8001
- [ ] PDF extraction works with MaxPreps-style PDFs
- [ ] Table extraction fallback works
- [ ] Completed games are filtered out
- [ ] Info message shows count of skipped games
- [ ] CSV/Excel upload still works (no regression)
- [ ] Error handling for invalid PDFs
- [ ] Error handling for service offline

### Edge Cases
- [ ] Invalid PDF (scanned image) - shows error message
- [ ] Empty PDF (0 games) - shows error
- [ ] Too many games (>200) - shows error from service
- [ ] File too large (>10MB) - shows size error
- [ ] Python service offline - shows "service unavailable" error

## Usage Instructions

### For Development
```bash
# Terminal 1: Start Python service
cd pdf-service
./start.sh

# Terminal 2: Start Next.js
npm run dev
```

Visit http://localhost:3000 and upload a PDF file.

### For Production
The Python service needs to be deployed separately:
- Docker container
- AWS Lambda function
- Dedicated server/VM

Update `PDF_SERVICE_URL` environment variable to point to production service.

## Dependencies Added

### Python (pdf-service/requirements.txt)
- `fastapi==0.104.1` - Web framework
- `uvicorn[standard]==0.24.0` - ASGI server
- `pdfplumber==0.10.3` - PDF text extraction
- `python-multipart==0.0.6` - File upload support

### Next.js
No new npm dependencies required.

## Future Enhancements

### Phase 2: Claude Vision Fallback
When pdfplumber extraction fails, offer AI-powered extraction:
- Handle scanned/image PDFs
- Work with complex layouts
- Higher success rate
- Requires Anthropic API key (~$0.02 per PDF)

## Known Limitations

1. **Scanned PDFs:** Not supported in Phase 1 (requires OCR or Claude Vision)
2. **Complex Layouts:** May fail to extract (fallback to CSV/Excel)
3. **Service Dependency:** PDF uploads require Python service running
4. **Year Detection:** Assumes current season (Aug-Dec = 2025, Jan-Jul = 2026)

## Success Criteria
- ✅ Python service runs on port 8001
- ✅ API route proxies to Python service
- ✅ File limits updated for PDFs
- ✅ FileUpload component detects and processes PDFs
- ✅ FileDropzone accepts .pdf files
- ✅ App context supports PDF metadata
- ✅ TypeScript compilation succeeds
- ✅ Documentation updated
- ⏳ End-to-end test with real PDF (awaiting test file)

## Files Modified

### New Files (7)
1. `/pdf-service/pdf_service.py`
2. `/pdf-service/requirements.txt`
3. `/pdf-service/README.md`
4. `/pdf-service/start.sh`
5. `/app/api/process-pdf/route.ts`
6. `/PDF_FEATURE_SUMMARY.md` (this file)

### Modified Files (6)
1. `/lib/constants.ts` - File limits
2. `/components/ui/FileDropzone.tsx` - Validation + UI
3. `/components/steps/FileUpload.tsx` - PDF handling
4. `/contexts/AppContext.tsx` - New action
5. `/types/index.ts` - State type
6. `/README.md` - Documentation
7. `.env.local` - Config
8. `.env.local.example` - Config template

## Deployment Notes

### Vercel Deployment
The Python service cannot run on Vercel's serverless infrastructure. Options:
1. Deploy Python service separately (Railway, Render, Fly.io)
2. Convert to Vercel serverless function (requires restructuring)
3. Use third-party PDF API service
4. Deploy to AWS Lambda with API Gateway

For now, PDF feature only works in local development. Production deployment requires separate Python service infrastructure.
