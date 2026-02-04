# Setup Guide

## Quick Start

### 1. Install Next.js Dependencies
```bash
npm install
```

### 2. Install Python Dependencies (for PDF support)
```bash
cd pdf-service
pip3 install -r requirements.txt
cd ..
```

### 3. Configure Environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your ScoreStream credentials:
- `NEXT_PUBLIC_SCORESTREAM_API_KEY` - Your API key
- `NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN` - Your access token

### 4. Start the Services

**Terminal 1 - Start PDF Service (for PDF uploads):**
```bash
cd pdf-service
./start.sh
```

**Terminal 2 - Start Next.js:**
```bash
npm run dev
```

### 5. Open the App
Visit http://localhost:3000

## Services

### Next.js App
- **Port:** 3000
- **Required:** Yes
- **Purpose:** Main web application

### PDF Service
- **Port:** 8001
- **Required:** Only for PDF uploads
- **Purpose:** Extract schedules from PDF files
- **Note:** CSV/Excel uploads work without this service

## Testing

### Test CSV Upload
1. Create a CSV file with columns: Date, Time, Home Team, Away Team
2. Upload via the web interface
3. Follow the mapping and team resolution flow

### Test PDF Upload
1. Ensure PDF service is running (port 8001)
2. Upload a MaxPreps-style schedule PDF
3. PDF data should extract automatically
4. Completed games will be filtered out

## Troubleshooting

### "PDF service unavailable" error
- Make sure the PDF service is running on port 8001
- Check terminal 1 for Python service errors
- Verify dependencies: `cd pdf-service && pip3 install -r requirements.txt`

### Port 8001 already in use
```bash
# Find and kill the process
lsof -ti:8001 | xargs kill -9
```

### Python dependencies fail to install
Make sure you have Python 3.7+ installed:
```bash
python3 --version
```

If using a virtual environment:
```bash
cd pdf-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python pdf_service.py
```

## Production Deployment

### Vercel (Next.js only)
The Next.js app deploys automatically to Vercel. PDF support requires separate Python service deployment.

### Python Service Options
1. **Railway/Render/Fly.io** - Easy Python deployment
2. **AWS Lambda** - Serverless option
3. **Docker** - Containerized deployment
4. **DigitalOcean/Linode** - VPS deployment

Update `PDF_SERVICE_URL` in production environment variables to point to your deployed Python service.
