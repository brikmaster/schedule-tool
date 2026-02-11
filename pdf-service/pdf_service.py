import pdfplumber
import re
from typing import List, Dict, Optional, Tuple
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
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
MAX_GAMES = 400


def detect_schedule_star_format(text: str) -> bool:
    """
    Detect Schedule Star format by looking for:
    - "Schedule Star" text
    - Phone "866-448-9438"
    - "*=League Event" footer
    - Team level headers (Boys Varsity, etc.)
    """
    indicators = [
        re.search(r'Schedule\s+Star', text, re.IGNORECASE),
        re.search(r'866-448-9438', text),
        re.search(r'\*=League Event', text),
        re.search(r'Boys|Girls\s+(Varsity|Junior Varsity|Freshman)', text)
    ]
    return sum(bool(x) for x in indicators) >= 2


def detect_cif_bracket_format(text: str) -> bool:
    """
    Detect CIF-SS playoff bracket format by looking for:
    - "CIF-SS" text
    - "CHAMPIONSHIPS" text
    - Round indicators (Round 1, Round 2, etc.)
    - "*DENOTES HOST TEAM" text
    """
    indicators = [
        re.search(r'CIF-SS', text, re.IGNORECASE),
        re.search(r'CHAMPIONSHIPS', text, re.IGNORECASE),
        re.search(r'Round 1', text, re.IGNORECASE),
        re.search(r'\*DENOTES HOST TEAM', text, re.IGNORECASE),
    ]
    return sum(bool(x) for x in indicators) >= 3


def detect_texas_isd_format(text: str) -> bool:
    """
    Detect Texas ISD multi-school format by looking for:
    - Column headers: "Day Of Week", "School Name", "Location", "Opponent"
    - "BASKETBALL SCHEDULE" or "VARSITY" in title
    - Multiple school names in content
    """
    indicators = [
        re.search(r'Day Of Week', text, re.IGNORECASE),
        re.search(r'School Name', text, re.IGNORECASE),
        re.search(r'VARSITY.*BASKETBALL.*SCHEDULE', text, re.IGNORECASE),
        re.search(r'Start Date.*Start Time', text, re.IGNORECASE),
        re.search(r'Location.*Sport.*Opponent', text, re.IGNORECASE),
    ]
    return sum(bool(x) for x in indicators) >= 3


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

    # Log first 500 chars to help debug
    print(f"[PDF Extract] First 500 chars: {all_text[:500]}")

    # Extract main team from header (supports Basketball, Football, etc.)
    # Pattern: "Printable? [Team Name] High School? [Sport] Schedule"
    main_team_match = re.search(
        r'(?:Printable\s+)?(.+?)\s+(?:Basketball|Football|Baseball|Softball|Soccer|Volleyball|Hockey|Lacrosse)\s+Schedule',
        all_text,
        re.MULTILINE | re.IGNORECASE
    )

    if main_team_match:
        main_team = main_team_match.group(1).strip()
        main_team = re.sub(r'^Printable\s+', '', main_team)
        print(f"[PDF Extract] Found main team via schedule header: {main_team}")
    else:
        print("[PDF Extract] No match on schedule header, trying address...")
        # Fallback: look for "High School" pattern in address
        hs_match = re.search(
            r'Address[:\s]+[^,]*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:High School|HS)',
            all_text
        )
        if hs_match:
            main_team = hs_match.group(1) + " High School"
            print(f"[PDF Extract] Found main team via address: {main_team}")
        else:
            print("[PDF Extract] Could not find main team - setting to Unknown")
            main_team = "Unknown"

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


def extract_schedule_star_format(pdf_file: io.BytesIO) -> Dict:
    """
    Extract schedule from Schedule Star format PDFs.
    Extracts first team section found (usually Varsity).
    """
    # 1. Extract text from PDF
    with pdfplumber.open(pdf_file) as pdf:
        all_text = "\n".join(page.extract_text() for page in pdf.pages)

    # 2. Extract school info from header
    # Pattern matches: "Team Schedule [School Name] High School"
    school_match = re.search(
        r'Team Schedule\s+(.+?High School)',
        all_text, re.MULTILINE
    )
    if school_match:
        main_team = school_match.group(1).strip()
    else:
        # Fallback: try to find any "... High School" pattern
        fallback_match = re.search(
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+High School)',
            all_text, re.MULTILINE
        )
        main_team = fallback_match.group(1) if fallback_match else "Unknown"

    # 3. Extract address for city/state
    addr_match = re.search(
        r'([A-Za-z\s]+),\s*([A-Z]{2})\s+\d{5}',
        all_text
    )
    main_city = addr_match.group(1).strip() if addr_match else None
    main_state = addr_match.group(2) if addr_match else None

    # 4. Find Varsity section and limit extraction to only Varsity games
    varsity_section_match = re.search(
        r'(Boys|Girls)\s+Varsity',
        all_text, re.IGNORECASE
    )

    if not varsity_section_match:
        print("[Schedule Star] No Varsity section found")
        # If no Varsity section found, extract all games (fallback)
        varsity_text = all_text
    else:
        varsity_start = varsity_section_match.start()

        # Find the next team section (Junior Varsity or Freshman) to know where to stop
        next_section_match = re.search(
            r'(Boys|Girls)\s+(Junior Varsity|Freshman)',
            all_text[varsity_start:],
            re.IGNORECASE
        )

        if next_section_match:
            # Extract only up to the next section
            varsity_end = varsity_start + next_section_match.start()
            varsity_text = all_text[varsity_start:varsity_end]
            print(f"[Schedule Star] Extracting Varsity section only (chars {varsity_start}-{varsity_end})")
        else:
            # No other section found, extract from Varsity to end
            varsity_text = all_text[varsity_start:]
            print(f"[Schedule Star] Extracting Varsity section to end of document")

    # 5. Parse game lines from Varsity section only
    # Game line pattern - captures all components on one line
    game_line_pattern = re.compile(
        r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+'  # Day
        r'(\d{2}/\d{2}/\d{2})\s+'           # Date MM/DD/YY
        r'(\*?)(.+?)\s+'                     # League marker + Opponent
        r'(Home|Away)\s+'                    # Home/Away
        r'(TBA|\d{1,2}:\d{2}\s*[AP]M)',     # Time
        re.MULTILINE
    )

    games = []
    for match in game_line_pattern.finditer(varsity_text):
        day_of_week = match.group(1)
        date_str = match.group(2)      # MM/DD/YY
        is_league = bool(match.group(3))
        opponent = match.group(4).strip().lstrip('*').strip()
        location = match.group(5)      # Home or Away
        time_str = match.group(6)

        # Skip "OPEN" tournament placeholders
        if opponent.startswith('OPEN'):
            continue

        # Convert MM/DD/YY to MM/DD/YYYY
        month, day, year = date_str.split('/')
        formatted_date = f"{month}/{day}/20{year}"

        # Normalize time
        if time_str == 'TBA':
            time_normalized = None
        else:
            # Clean up time formatting - ensure single space before AM/PM
            time_normalized = re.sub(r'\s*([AP]M)', r' \1', time_str)

        # Determine home/away teams
        if location == 'Home':
            home_team = main_team
            away_team = opponent
            home_city = main_city
            home_state = main_state
            away_city = None
            away_state = None
        else:
            home_team = opponent
            away_team = main_team
            home_city = None
            home_state = None
            away_city = main_city
            away_state = main_state

        games.append({
            'date': formatted_date,
            'time': time_normalized,
            'homeTeam': home_team,
            'awayTeam': away_team,
            'homeCity': home_city,
            'homeState': home_state,
            'awayCity': away_city,
            'awayState': away_state,
            'homeScore': None,
            'awayScore': None,
            'isCompleted': False,
        })

    print(f"[Schedule Star] Extracted {len(games)} games from {main_team}")
    if games:
        print(f"[Schedule Star] First game: {games[0]}")

    return {
        'success': True,
        'mainTeam': main_team,
        'mainCity': main_city,
        'mainState': main_state,
        'games': games,
        'gameCount': len(games)
    }


def extract_cif_bracket_format(pdf_file: io.BytesIO) -> Dict:
    """
    Extract schedule from CIF-SS playoff bracket format PDFs.
    Extracts Round 1 matchups from tournament brackets.
    """
    # 1. Extract text from PDF
    with pdfplumber.open(pdf_file) as pdf:
        all_text = "\n".join(page.extract_text() for page in pdf.pages)

    # 2. Extract Round 1 date and time
    # In the bracket format, round headers are on one line: "Round 1 Round 2 Quarter Final..."
    # And dates/times are on the next line: "02/11/2026 07:00 PM 02/13/2026 07:00 PM..."
    # Extract the first date/time which corresponds to Round 1
    round1_match = re.search(
        r'Round 1.*?\n(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2}\s+[AP]M)',
        all_text,
        re.IGNORECASE | re.DOTALL
    )

    if not round1_match:
        print("[CIF Bracket] Could not find Round 1 date/time")
        return {
            'success': False,
            'games': [],
            'gameCount': 0
        }

    round1_date = round1_match.group(1)  # MM/DD/YYYY
    round1_time = round1_match.group(2)  # HH:MM AM/PM

    print(f"[CIF Bracket] Round 1: {round1_date} at {round1_time}")

    # 3. Extract all team lines
    # Pattern: "Team Name * (League info) W-L-T" or "Team Name (League info) W-L-T"
    # The asterisk indicates host team (appears after team name, before parenthesis)
    team_pattern = re.compile(
        r'^([A-Za-z][A-Za-z\s/.]+?)\s*(\*)?\s*\([^)]+\)\s+\d+-\d+-\d+\s*$',
        re.MULTILINE
    )

    teams = []
    for match in team_pattern.finditer(all_text):
        team_name = match.group(1).strip()
        is_host = bool(match.group(2))  # True if asterisk present
        teams.append({
            'name': team_name,
            'isHost': is_host
        })

    print(f"[CIF Bracket] Found {len(teams)} teams")

    if len(teams) == 0:
        return {
            'success': False,
            'games': [],
            'gameCount': 0
        }

    # 4. Pair teams into games (consecutive pairs)
    games = []
    for i in range(0, len(teams) - 1, 2):
        team1 = teams[i]
        team2 = teams[i + 1]

        # Determine home/away based on host designation
        if team1['isHost']:
            home_team = team1['name']
            away_team = team2['name']
        elif team2['isHost']:
            home_team = team2['name']
            away_team = team1['name']
        else:
            # If neither has asterisk, first team is home (shouldn't happen but handle it)
            home_team = team1['name']
            away_team = team2['name']

        games.append({
            'date': round1_date,
            'time': round1_time,
            'homeTeam': home_team,
            'awayTeam': away_team,
            'homeCity': None,
            'homeState': None,
            'awayCity': None,
            'awayState': None,
            'homeScore': None,
            'awayScore': None,
            'isCompleted': False,
        })

    print(f"[CIF Bracket] Extracted {len(games)} Round 1 games")
    if games:
        print(f"[CIF Bracket] First game: {games[0]}")

    return {
        'success': True,
        'mainTeam': None,
        'mainCity': None,
        'mainState': None,
        'games': games,
        'gameCount': len(games)
    }


def extract_texas_isd_format(pdf_file: io.BytesIO, school_filter: Optional[str] = None) -> Dict:
    """
    Extract schedule from Texas ISD multi-school format PDFs.
    Uses table extraction for better accuracy with wrapped text.

    Args:
        pdf_file: PDF file buffer
        school_filter: Optional school name to filter (e.g., "Brennan HS"). If None, extracts first school found.

    Returns:
        Dict with schedule data for the specified school
    """
    games_by_school = {}

    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()

            for table in tables:
                if not table or len(table) < 3:
                    continue

                # Find header row (usually row 0 or 1)
                header_row_idx = 0
                if table[0][0] and 'SCHEDULE' in str(table[0][0]).upper():
                    header_row_idx = 1  # Title row, headers are in row 1

                headers = [str(h).strip().lower() if h else "" for h in table[header_row_idx]]

                try:
                    day_idx = next(i for i, h in enumerate(headers) if 'day of week' in h or 'day' in h)
                    date_idx = next(i for i, h in enumerate(headers) if 'start date' in h or 'date' in h)
                    time_idx = next(i for i, h in enumerate(headers) if 'start time' in h or 'time' in h)
                    school_idx = next(i for i, h in enumerate(headers) if 'school name' in h)
                    location_idx = next(i for i, h in enumerate(headers) if 'location' in h)
                    sport_idx = next(i for i, h in enumerate(headers) if 'sport' in h)
                    opponent_idx = next(i for i, h in enumerate(headers) if 'opponent' in h)
                    venue_idx = next(i for i, h in enumerate(headers) if 'venue' in h)
                except StopIteration:
                    # This table doesn't have the expected columns
                    continue

                # Parse data rows (start after header row)
                for row in table[header_row_idx + 1:]:
                    if not row or len(row) <= max(day_idx, date_idx, time_idx, school_idx, location_idx, opponent_idx):
                        continue

                    date_str = str(row[date_idx]).strip() if row[date_idx] else None
                    time_str = str(row[time_idx]).strip() if row[time_idx] else None
                    school_name = str(row[school_idx]).strip() if row[school_idx] else None
                    location = str(row[location_idx]).strip() if row[location_idx] else None
                    opponent_raw = str(row[opponent_idx]).strip() if row[opponent_idx] else None

                    # Clean up opponent name (remove newlines, extra whitespace, mascot names on separate lines)
                    if opponent_raw:
                        # Replace newlines with spaces, collapse multiple spaces
                        opponent = re.sub(r'\s+', ' ', opponent_raw.replace('\n', ' ')).strip()

                        # Remove common mascot/team names that appear after school name
                        opponent = re.split(r'\s+(Tigers?|Eagles?|Warriors?|Knights?|Patriots?|Buffaloes?|Rangers?|Basketball|Varsity|Cougars?|Lions?|Panthers?)', opponent)[0].strip()

                        # Remove abbreviations at the end (e.g., "Westlake High School WHS" -> "Westlake High School")
                        opponent = re.sub(r'\s+[A-Z]{2,4}$', '', opponent)

                        # Remove duplicate school names (e.g., "United HS United" -> "United HS")
                        words = opponent.split()
                        if len(words) >= 3 and words[-1] == words[0]:
                            opponent = ' '.join(words[:-1])
                    else:
                        opponent = None

                    # Skip invalid rows
                    if not date_str or not school_name or not opponent or not location:
                        continue

                    # Skip header rows that got repeated
                    if 'Day Of Week' in date_str or 'Start Date' in date_str:
                        continue

                    # Skip tournament games with TBD opponents
                    if opponent in ['TBD', 'None'] or 'Tournament' in opponent or 'Classic' in opponent or 'Invitational' in opponent:
                        continue

                    # Normalize time
                    if time_str in ['TBA', 'None', '']:
                        time_normalized = None
                    else:
                        time_normalized = re.sub(r'\s*([AP]M)', r' \1', time_str)

                    # Determine home/away teams
                    if location == 'Home':
                        home_team = school_name
                        away_team = opponent
                        home_city = None
                        home_state = 'TX'
                        away_city = None
                        away_state = None
                    else:  # Away
                        home_team = opponent
                        away_team = school_name
                        home_city = None
                        home_state = None
                        away_city = None
                        away_state = 'TX'

                    game = {
                        'date': date_str,
                        'time': time_normalized,
                        'homeTeam': home_team,
                        'awayTeam': away_team,
                        'homeCity': home_city,
                        'homeState': home_state,
                        'awayCity': away_city,
                        'awayState': away_state,
                        'homeScore': None,
                        'awayScore': None,
                        'isCompleted': False,
                    }

                    # Group by school
                    if school_name not in games_by_school:
                        games_by_school[school_name] = []
                    games_by_school[school_name].append(game)

    # Determine which school to return
    if not games_by_school:
        print("[Texas ISD] No games found")
        return {
            'success': False,
            'mainTeam': None,
            'mainCity': None,
            'mainState': None,
            'games': [],
            'gameCount': 0
        }

    # Calculate game counts for each school
    school_game_counts = {school: len(games) for school, games in games_by_school.items()}

    # If no school_filter specified, return school selection prompt
    if not school_filter:
        print(f"[Texas ISD] Multi-school PDF detected. Awaiting school selection.")
        print(f"[Texas ISD] Available schools: {list(games_by_school.keys())}")
        return {
            'success': True,
            'requiresSchoolSelection': True,
            'availableSchools': [
                {'name': school, 'gameCount': count}
                for school, count in school_game_counts.items()
            ],
            'mainTeam': None,
            'mainCity': None,
            'mainState': 'TX',
            'games': [],
            'gameCount': 0
        }

    # If school_filter specified, use it
    school_name = school_filter
    games = games_by_school.get(school_filter, [])

    if not games:
        print(f"[Texas ISD] School '{school_filter}' not found. Available: {list(games_by_school.keys())}")
        return {
            'success': False,
            'error': f"School '{school_filter}' not found in PDF",
            'availableSchools': [
                {'name': school, 'gameCount': count}
                for school, count in school_game_counts.items()
            ],
            'mainTeam': None,
            'mainCity': None,
            'mainState': None,
            'games': [],
            'gameCount': 0
        }

    print(f"[Texas ISD] Extracted {len(games)} games from {school_name}")
    print(f"[Texas ISD] Available schools: {list(games_by_school.keys())}")
    if games:
        print(f"[Texas ISD] First game: {games[0]}")

    return {
        'success': True,
        'mainTeam': school_name,
        'mainCity': None,  # Not in this format
        'mainState': 'TX',
        'games': games,
        'gameCount': len(games),
        'availableSchools': [
            {'name': school, 'gameCount': count}
            for school, count in school_game_counts.items()
        ]
    }


def detect_iowa_hs_format(text: str) -> bool:
    indicators = [
        re.search(r'IOWA HIGH SCHOOL ATHLETIC ASSOCIATION', text, re.IGNORECASE),
        re.search(r'REGULAR SEASON SCHEDULES', text, re.IGNORECASE),
        re.search(r'GROUP \d', text),
        re.search(r'Week \d', text),
    ]
    return sum(bool(x) for x in indicators) >= 3


IOWA_CITY_FIRST = {
    'Des Moines', 'Iowa City', 'Sioux City', 'Council Bluffs',
    'Cedar Rapids', 'Davenport', 'Dubuque', 'Waterloo',
}


def _parse_iowa_team_name(raw: str) -> tuple:
    """Parse Iowa-style 'City, School' or 'School, City' into (team_name, city).
    Returns (raw, None) for names without commas.
    """
    if ',' not in raw:
        return (raw, None)
    before, after = raw.split(',', 1)
    before = before.strip()
    after = after.strip()
    if before in IOWA_CITY_FIRST:
        return (after, before)
    return (before, after)


def _parse_iowa_date(date_text: str, year: int) -> Optional[str]:
    """Convert 'Aug. 29' or 'Sept. 5' to 'MM/DD/YYYY'."""
    month_map = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    }
    m = re.match(r'([A-Za-z]+)\.?\s+(\d{1,2})', date_text.strip())
    if not m:
        return None
    month_str = m.group(1).lower().rstrip('.')
    day = int(m.group(2))
    month = month_map.get(month_str)
    if not month:
        return None
    return f"{month}/{day}/{year}"


def _build_column_ranges(col_positions: List[Tuple[float, str]], page_width: float, date_col_right: float = 160.0) -> List[Tuple[float, float, str]]:
    """Build (left, right, name) ranges using midpoints between column headers."""
    ranges = []
    for i, (cx, name) in enumerate(col_positions):
        if i == 0:
            left = date_col_right  # Just past the Date column
        else:
            left = (col_positions[i - 1][0] + cx) / 2
        if i == len(col_positions) - 1:
            right = page_width
        else:
            right = (cx + col_positions[i + 1][0]) / 2
        ranges.append((left, right, name))
    return ranges


def _assign_word_to_column(word_x0: float, col_ranges: List[Tuple[float, float, str]]) -> Optional[str]:
    """Find which column range a word falls into."""
    for left, right, name in col_ranges:
        if left <= word_x0 < right:
            return name
    return None


def extract_iowa_hs_format(pdf_file: io.BytesIO, school_filter: Optional[str] = None) -> Dict:
    """
    Extract schedule from Iowa HS Athletic Association grid PDFs.
    Column-based: each school is a column, rows are weeks.
    Supports multiple groups per year, 2025 + 2026 sections.
    """
    games_by_school = {}

    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            page_width = page.width
            words = page.extract_words(keep_blank_chars=True, x_tolerance=3, y_tolerance=3)
            if not words:
                continue

            # Sort words by y then x
            words.sort(key=lambda w: (w['top'], w['x0']))

            # Find year markers
            year_markers = []
            for w in words:
                if w['text'].strip() in ('2025', '2026'):
                    year_markers.append((w['top'], int(w['text'].strip())))
            if not year_markers:
                year_markers = [(0, 2025)]

            # Find "School" header rows and their y-positions
            school_headers = [w for w in words if w['text'].strip().lower() == 'school' and w['x0'] < 100]

            for sh in school_headers:
                header_y = sh['top']

                # Determine which year this group belongs to
                year = 2025
                for ym_top, ym_year in sorted(year_markers, reverse=True):
                    if header_y > ym_top:
                        year = ym_year
                        break

                # Only extract 2026 games
                if year != 2026:
                    continue

                # Get all words on the header row (school names + "School" + "Date")
                row_words = sorted(
                    [w for w in words if abs(w['top'] - header_y) < 2],
                    key=lambda w: w['x0']
                )

                # Extract school column positions (skip "School" and "Date" labels)
                # Also track Date column position for relative thresholds
                col_positions = []
                date_x0 = None
                for w in row_words:
                    txt = w['text'].strip()
                    if txt.lower() == 'school':
                        continue
                    if txt.lower() == 'date':
                        date_x0 = w['x0']
                        continue
                    col_positions.append((w['x0'], txt))

                if not col_positions:
                    continue

                # Compute dynamic thresholds based on actual positions
                first_col_x0 = col_positions[0][0]
                date_col_right = first_col_x0 - 10
                data_start_x0 = date_col_right

                col_ranges = _build_column_ranges(col_positions, page_width, date_col_right)

                # Find Week rows for this group (directly below header, within ~250px)
                # Week labels should be to the left of the first school column
                week_x0_limit = first_col_x0
                week_rows = []
                for w in words:
                    wm = re.match(r'Week\s+(\d+)', w['text'].strip())
                    if wm and w['x0'] < week_x0_limit and w['top'] > header_y and w['top'] < header_y + 250:
                        week_rows.append((w['top'], int(wm.group(1))))

                week_rows.sort(key=lambda x: x[0])

                for week_y, week_num in week_rows:
                    # Get all words on this week's row
                    row_words = sorted(
                        [w for w in words if abs(w['top'] - week_y) < 2],
                        key=lambda w: w['x0']
                    )

                    # Extract date from the Date column (between School label and first school column)
                    date_text = None
                    for w in row_words:
                        if date_col_right - 80 < w['x0'] < first_col_x0 and not w['text'].strip().startswith('Week'):
                            date_text = w['text'].strip()
                            break

                    game_date = _parse_iowa_date(date_text, year) if date_text else None
                    if not game_date:
                        continue

                    # Assign opponent words to school columns (skip Week and Date words)
                    for w in row_words:
                        if w['x0'] < data_start_x0:  # Skip "Week N" and date
                            continue

                        school_name = _assign_word_to_column(w['x0'], col_ranges)
                        if not school_name:
                            continue

                        opponent_text = w['text'].strip()
                        if not opponent_text:
                            continue

                        is_away = opponent_text.lower().startswith('at ')
                        opponent_raw = re.sub(r'^at\s+', '', opponent_text, flags=re.IGNORECASE).strip()

                        # Parse comma-separated names into (team, city)
                        school_clean, school_city = _parse_iowa_team_name(school_name)
                        opp_clean, opp_city = _parse_iowa_team_name(opponent_raw)

                        if is_away:
                            home_team = opp_clean
                            away_team = school_clean
                            home_city = opp_city
                            away_city = school_city
                        else:
                            home_team = school_clean
                            away_team = opp_clean
                            home_city = school_city
                            away_city = opp_city

                        game = {
                            'date': game_date,
                            'time': None,
                            'homeTeam': home_team,
                            'awayTeam': away_team,
                            'homeCity': home_city,
                            'homeState': 'IA',
                            'awayCity': away_city,
                            'awayState': 'IA',
                            'homeScore': None,
                            'awayScore': None,
                            'isCompleted': False,
                        }

                        if school_name not in games_by_school:
                            games_by_school[school_name] = []
                        games_by_school[school_name].append(game)

    if not games_by_school:
        return {
            'success': False,
            'mainTeam': None,
            'mainCity': None,
            'mainState': 'IA',
            'games': [],
            'gameCount': 0,
        }

    school_game_counts = {s: len(g) for s, g in games_by_school.items()}

    if not school_filter:
        print(f"[Iowa HS] Multi-school PDF. {len(games_by_school)} schools found.")
        return {
            'success': True,
            'requiresSchoolSelection': True,
            'availableSchools': [
                {'name': s, 'gameCount': c}
                for s, c in sorted(school_game_counts.items())
            ],
            'mainTeam': None,
            'mainCity': None,
            'mainState': 'IA',
            'games': [],
            'gameCount': 0,
        }

    # All schools: combine and deduplicate
    if school_filter == '__all__':
        seen = set()
        all_games = []
        for school_games in games_by_school.values():
            for g in school_games:
                key = (g['date'], g['homeTeam'], g['awayTeam'])
                if key not in seen:
                    seen.add(key)
                    all_games.append(g)
        def _date_sort_key(g):
            parts = g['date'].split('/')
            return (int(parts[2]), int(parts[0]), int(parts[1]))
        all_games.sort(key=_date_sort_key)
        print(f"[Iowa HS] Extracted {len(all_games)} unique games (all schools)")
        return {
            'success': True,
            'mainTeam': 'All Schools',
            'mainCity': None,
            'mainState': 'IA',
            'games': all_games,
            'gameCount': len(all_games),
            'availableSchools': [
                {'name': s, 'gameCount': c}
                for s, c in sorted(school_game_counts.items())
            ],
        }

    games = games_by_school.get(school_filter, [])
    if not games:
        return {
            'success': False,
            'error': f"School '{school_filter}' not found in PDF",
            'availableSchools': [
                {'name': s, 'gameCount': c}
                for s, c in sorted(school_game_counts.items())
            ],
            'mainTeam': None,
            'mainCity': None,
            'mainState': 'IA',
            'games': [],
            'gameCount': 0,
        }

    print(f"[Iowa HS] Extracted {len(games)} games for {school_filter}")
    return {
        'success': True,
        'mainTeam': school_filter,
        'mainCity': None,
        'mainState': 'IA',
        'games': games,
        'gameCount': len(games),
        'availableSchools': [
            {'name': s, 'gameCount': c}
            for s, c in sorted(school_game_counts.items())
        ],
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
async def extract_schedule(file: UploadFile = File(...), school: Optional[str] = None):
    """
    Extract game schedule from uploaded PDF file.

    Args:
        file: PDF file upload
        school: Optional school name filter for multi-school PDFs (e.g., Texas ISD format)
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
        # Extract first page for format detection
        with pdfplumber.open(pdf_file) as pdf:
            first_page_text = pdf.pages[0].extract_text()

        pdf_file.seek(0)

        # Detect and route to correct extractor
        if detect_cif_bracket_format(first_page_text):
            print("[PDF Extract] Detected CIF bracket format")
            result = extract_cif_bracket_format(pdf_file)
        elif detect_iowa_hs_format(first_page_text):
            print(f"[PDF Extract] Detected Iowa HS format (school filter: {school})")
            result = extract_iowa_hs_format(pdf_file, school_filter=school)
        elif detect_schedule_star_format(first_page_text):
            print("[PDF Extract] Detected Schedule Star format")
            result = extract_schedule_star_format(pdf_file)
        elif detect_texas_isd_format(first_page_text):
            print(f"[PDF Extract] Detected Texas ISD format (school filter: {school})")
            result = extract_texas_isd_format(pdf_file, school_filter=school)
        else:
            print("[PDF Extract] Trying MaxPreps format")
            result = extract_maxpreps_schedule(pdf_file)

        # If no games found with MaxPreps, try table extraction fallback
        if result['gameCount'] == 0 and not result.get('requiresSchoolSelection'):
            pdf_file.seek(0)
            result = extract_table_schedule(pdf_file)

        # Validate game count (skip if awaiting school selection)
        if result['gameCount'] == 0 and not result.get('requiresSchoolSelection'):
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
    import os
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
