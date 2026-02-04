import pdfplumber
import re
from typing import List, Dict, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import io

app = FastAPI(title="PDF Schedule Extraction Service")

# CORS middleware for Next.js API route
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
MAX_GAMES = 200


def extract_maxpreps_schedule(pdf_file: io.BytesIO) -> Dict:
    """
    Extract game schedule from MaxPreps-style PDF.
    Returns dict with main_team info and list of games.
    """

    with pdfplumber.open(pdf_file) as pdf:
        # Get all text
        all_text = ""
        for page in pdf.pages:
            all_text += page.extract_text() + "\n"

    # Extract main team from header
    main_team_match = re.search(
        r'(?:Printable\s+)?([A-Za-z\s]+?(?:High School)?)\s+Basketball Schedule',
        all_text,
        re.MULTILINE
    )
    if main_team_match:
        main_team = main_team_match.group(1).strip()
        main_team = re.sub(r'^Printable\s+', '', main_team)
    else:
        # Fallback: look for "High School" pattern in address
        hs_match = re.search(
            r'Address[:\s]+[^,]*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:High School|HS)',
            all_text
        )
        main_team = hs_match.group(1) + " High School" if hs_match else "Unknown"

    # Extract city/state for main team from address line
    addr_match = re.search(r'Address[:\s]+[^,]+,\s*([^,]+),\s*([A-Z]{2})\s+\d{5}', all_text)
    main_city = addr_match.group(1).strip() if addr_match else None
    main_state = addr_match.group(2) if addr_match else None

    # Parse game lines
    games = []
    lines = all_text.split('\n')

    # Game line pattern
    game_pattern = re.compile(
        r'^(\d{1,2}/\d{1,2})\s+'           # Date
        r'(@?\s*)([^(]+?)\s*'              # @ indicator + Team name
        r'\(([^,]+),\s*([A-Z]{2})\)\s*'    # (City, State)
        r'(\*{0,3})\s*'                    # Optional *, **, or ***
        r'(?:\(([WL])\)\s*(\d+)\s*-\s*(\d+)|(Preview Game))?'  # Score or Preview
    )

    time_pattern = re.compile(r'^(\d{1,2}:\d{2}[ap])')

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        match = game_pattern.match(line)
        if match:
            date = match.group(1)
            is_away = bool(match.group(2).strip())
            opponent_raw = match.group(3).strip()
            opp_city = match.group(4).strip()
            opp_state = match.group(5)
            game_type = match.group(6)  # *, **, ***
            result = match.group(7)      # W or L
            score1 = match.group(8)
            score2 = match.group(9)
            is_preview = match.group(10) == "Preview Game"

            # Look ahead for time on next line
            game_time = None
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                time_match = time_pattern.match(next_line)
                if time_match:
                    game_time = time_match.group(1)
                    # Convert to standard format
                    game_time = game_time.replace('p', ' PM').replace('a', ' AM')

            # Determine scores (Winner - Loser format in MaxPreps)
            if result == 'W':
                main_team_score = int(score1) if score1 else None
                opponent_score = int(score2) if score2 else None
            elif result == 'L':
                main_team_score = int(score2) if score2 else None
                opponent_score = int(score1) if score1 else None
            else:
                main_team_score = None
                opponent_score = None

            # Determine home/away teams and assign scores correctly
            if is_away:
                # Main team is AWAY
                home_team = opponent_raw
                away_team = main_team
                home_city = opp_city
                home_state = opp_state
                away_city = main_city
                away_state = main_state
                home_score = opponent_score
                away_score = main_team_score
            else:
                # Main team is HOME
                home_team = main_team
                away_team = opponent_raw
                home_city = main_city
                home_state = main_state
                away_city = opp_city
                away_state = opp_state
                home_score = main_team_score
                away_score = opponent_score

            game = {
                'date': f"{date}/2025" if int(date.split('/')[0]) >= 8 else f"{date}/2026",
                'time': game_time,
                'homeTeam': home_team,
                'awayTeam': away_team,
                'homeCity': home_city,
                'homeState': home_state,
                'awayCity': away_city,
                'awayState': away_state,
                'homeScore': home_score,
                'awayScore': away_score,
                'isCompleted': result is not None,
            }

            games.append(game)

        i += 1

    return {
        'success': True,
        'mainTeam': main_team,
        'mainCity': main_city,
        'mainState': main_state,
        'games': games,
        'gameCount': len(games)
    }


def extract_table_schedule(pdf_file: io.BytesIO) -> Dict:
    """
    Fallback: Extract schedule from table-based PDFs.
    """
    games = []

    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()

            for table in tables:
                if not table or len(table) < 2:
                    continue

                # Assume first row is headers
                headers = [str(h).lower() if h else "" for h in table[0]]

                # Find relevant columns
                date_idx = next((i for i, h in enumerate(headers) if 'date' in h), None)
                time_idx = next((i for i, h in enumerate(headers) if 'time' in h), None)
                home_idx = next((i for i, h in enumerate(headers) if 'home' in h), None)
                away_idx = next((i for i, h in enumerate(headers) if 'away' in h or 'visitor' in h), None)

                if date_idx is None or (home_idx is None and away_idx is None):
                    continue

                # Parse rows
                for row in table[1:]:
                    if not row or len(row) <= max(filter(None, [date_idx, home_idx, away_idx])):
                        continue

                    date = row[date_idx] if date_idx is not None else None
                    time = row[time_idx] if time_idx is not None else None
                    home = row[home_idx] if home_idx is not None else None
                    away = row[away_idx] if away_idx is not None else None

                    if date and (home or away):
                        games.append({
                            'date': str(date),
                            'time': str(time) if time else None,
                            'homeTeam': str(home) if home else None,
                            'awayTeam': str(away) if away else None,
                            'homeCity': None,
                            'homeState': None,
                            'awayCity': None,
                            'awayState': None,
                            'homeScore': None,
                            'awayScore': None,
                            'isCompleted': False,
                        })

    return {
        'success': len(games) > 0,
        'mainTeam': None,
        'games': games,
        'gameCount': len(games)
    }


@app.post("/extract")
async def extract_schedule(file: UploadFile = File(...)):
    """
    Extract game schedule from uploaded PDF file.
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 10MB."
        )

    pdf_file = io.BytesIO(content)

    try:
        # Try MaxPreps extraction first
        result = extract_maxpreps_schedule(pdf_file)

        # If no games found, try table extraction
        if result['gameCount'] == 0:
            pdf_file.seek(0)
            result = extract_table_schedule(pdf_file)

        # Validate game count
        if result['gameCount'] == 0:
            raise HTTPException(
                status_code=400,
                detail="No games found in PDF. This can happen with scanned or image-based PDFs."
            )

        if result['gameCount'] > MAX_GAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Too many games ({result['gameCount']}). Maximum is {MAX_GAMES}."
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract schedule: {str(e)}"
        )


@app.get("/")
async def root():
    return {
        "service": "PDF Schedule Extraction Service",
        "version": "1.0.0",
        "endpoints": {
            "/extract": "POST - Extract schedule from PDF file",
            "/docs": "GET - API documentation"
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
