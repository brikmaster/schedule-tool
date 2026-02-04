# ScoreStream Bulk Schedule Importer

Upload and import game schedules from CSV/Excel/PDF files with automated team matching.

## Features
- Upload CSV/Excel files (up to 1000 games)
- Upload PDF files (up to 200 games, 10MB) - MaxPreps schedules supported
- Smart header detection
- Auto-column mapping
- Confidence-based team matching
- Interactive disambiguation
- Bulk game creation

## Tech Stack
- Next.js 16 with App Router
- React 19 + TypeScript 5
- Tailwind CSS 4
- ScoreStream JSON-RPC 2.0 API
- Python FastAPI + pdfplumber (PDF extraction service)

## Development Setup

### 1. Install Next.js dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your ScoreStream API credentials
```

### 3. Start the PDF extraction service (required for PDF uploads)
```bash
cd pdf-service
./start.sh
# Service runs on http://localhost:8001
```

### 4. Start the Next.js dev server
```bash
npm run dev
# App runs on http://localhost:3000
```

## PDF Support

The tool supports MaxPreps-style PDF schedules with automatic extraction of:
- Game dates and times
- Home/away teams with city/state
- Completed game scores (filtered out, only upcoming games scheduled)

**Note:** PDF extraction requires the Python service to be running. CSV/Excel uploads work without it.

## Deployment
Automatically deployed to Vercel on every push to main branch.

