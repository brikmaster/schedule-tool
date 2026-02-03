# ScoreStream Bulk Schedule Importer

## Master Specification v2.0

> **For Claude Code:** This is your source of truth. Read this entire file before writing any code. Section 10 contains phased execution prompts—follow them in order.

---

## 1. Project Overview

### 1.1 What We're Building
A bulk schedule upload tool that lets ScoreStream users import game schedules from CSV/Excel files, validate teams against the ScoreStream API, resolve ambiguous matches interactively, and create multiple games in one workflow.

### 1.2 The Problem
ScoreStream's current Game Scheduler only handles one game at a time. Athletic directors and league admins often have spreadsheets with 50-200 games. Manual entry is painful.

### 1.3 The Solution
Upload a file → Map columns → Resolve team ambiguities → Review → Bulk create games.

### 1.4 Design Principle
**Match the existing ScoreStream UI exactly.** See Section 4 for the design system extracted from the current Game Scheduler.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (matching ScoreStream design system) |
| File Parsing | Papa Parse (CSV), SheetJS (Excel) |
| State | React Context + useReducer |
| Deployment | ScoreStream subdomain |

---

## 3. User Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   UPLOAD     │───▶│   DEFAULTS   │───▶│  MAP COLUMNS │───▶│    QUEUE     │───▶│    SUBMIT    │
│   File       │    │   Sport/TZ   │    │              │    │   Review     │    │   Results    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 3.1 Step 1: Upload File
- Drag-and-drop or click to upload
- Accept: `.csv`, `.xlsx`, `.xls`
- Limits: 200 rows max, 5MB max
- Show preview of first 5 rows

### 3.2 Step 2: Set Defaults
- **Sport** (required): Dropdown matching existing UI
- **Level/Squad** (required): Varsity Boys, JV Girls, etc.
- **Timezone** (required): Default to America/Los_Angeles
- **Game Segment**: Auto-selected based on sport

### 3.3 Step 3: Map Columns
- Auto-detect common column names
- Manual override via dropdowns
- Required: Date, Time, Home Team, Away Team
- Optional: City, State, Mascot for better matching

### 3.4 Step 4: The Queue (Review)
Display all games with **traffic light status**:

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 **Verified** | Both teams matched (100% confidence) | Ready to submit |
| 🟡 **Ambiguous** | Multiple possible matches found | Click to resolve |
| 🔴 **Error** | Missing data or no team found | Edit or remove |

**The Queue is the core UI.** Users spend most time here resolving 🟡 items.

### 3.5 Step 5: Submit & Results
- "Schedule [X] Games" button (only enabled when all rows are 🟢)
- Progress bar during submission
- Results: Created / Duplicate / Failed with links

---

## 4. Design System (Match Existing UI)

### 4.1 Brand Colors
```css
/* Extract from ScoreStream Game Scheduler screenshot */
--ss-primary: #29B6F6;        /* Header, links, accents */
--ss-primary-dark: #0288D1;   /* Button hover */
--ss-button: #2196F3;         /* Primary action buttons */
--ss-background: #ECEFF1;     /* Page background */
--ss-card: #FFFFFF;           /* Card backgrounds */
--ss-text: #37474F;           /* Primary text */
--ss-text-light: #78909C;     /* Helper text, placeholders */
--ss-border: #CFD8DC;         /* Input borders */
--ss-success: #4CAF50;        /* 🟢 Verified */
--ss-warning: #FF9800;        /* 🟡 Ambiguous */
--ss-error: #F44336;          /* 🔴 Error */
```

### 4.2 Component Patterns (from screenshot)

**Page Layout:**
- Cyan header bar with logo and search
- Content on light gray background (#ECEFF1)
- White card with subtle shadow for main content
- Generous padding (24-32px)

**Form Inputs:**
- Light border (#CFD8DC), rounded (4px)
- Labels above inputs, small text
- Helper text below in lighter gray
- "Clear" button inline on right of search inputs

**Dropdowns:**
- Match input styling
- Chevron indicator on right
- Placeholder: "Please select a sport"

**Team Search:**
- "Find a team" placeholder
- "Search Filters" link in cyan below
- "All States - All Organizations" filter display
- "BYE" and "TBD" toggle buttons for special cases

**Buttons:**
- Primary: Solid cyan/blue (#2196F3), white text, rounded
- Secondary: Outlined or text-only in cyan

**Section Headers:**
- "Additional Info" style - small caps or bold, acts as divider

### 4.3 Layout Reference
```
┌─────────────────────────────────────────────────────────────┐
│  [ScoreStream Logo]  [Search...]                            │  <- Cyan header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              Bulk Schedule Importer                 │   │  <- Title
│  │                                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────────────┐  │   │
│  │  │ Sport        ▼  │  │ [unnamed dropdown]   ▼  │  │   │  <- Two columns
│  │  └─────────────────┘  └─────────────────────────┘  │   │
│  │                                                     │   │
│  │  ... form content ...                               │   │
│  │                                                     │   │
│  │  ┌──────────────────┐                              │   │
│  │  │  Schedule Games  │                              │   │  <- Primary button
│  │  └──────────────────┘                              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. The Queue UI (Detailed)

This is the most important screen. Design it well.

### 5.1 Queue Table Structure
```
┌────┬────────────┬─────────┬─────────────────────┬─────────────────────┬──────────┬──────────┐
│ ✓  │    Date    │  Time   │      Away Team      │      Home Team      │  Status  │  Action  │
├────┼────────────┼─────────┼─────────────────────┼─────────────────────┼──────────┼──────────┤
│ ☑  │ 09/06/2025 │ 7:00 PM │ 🟢 Manteca Buffaloes│ 🟢 Oakdale Mustangs │    ✓     │          │
│ ☑  │ 09/13/2025 │ 7:00 PM │ 🟡 Washington ???   │ 🟢 Oakdale Mustangs │  Resolve │ [Resolve]│
│ ☐  │ 09/20/2025 │         │ 🔴 Unknown Team     │ 🟢 Oakdale Mustangs │  Error   │ [Edit]   │
└────┴────────────┴─────────┴─────────────────────┴─────────────────────┴──────────┴──────────┘

Selected: 2 of 3 games ready    [Schedule 2 Games]
```

### 5.2 Team Cell Display
When team is resolved (🟢):
```
┌─────────────────────────────┐
│ [Logo] Oakdale Mustangs     │
│        Oakdale, CA          │
└─────────────────────────────┘
```

When ambiguous (🟡):
```
┌─────────────────────────────┐
│ ⚠️ "Washington" (3 matches) │
│    [Click to resolve]       │
└─────────────────────────────┘
```

When error (🔴):
```
┌─────────────────────────────┐
│ ❌ "Xyz School"             │
│    No matches found         │
└─────────────────────────────┘
```

### 5.3 Resolution Modal
Trigger: Click "Resolve" on a 🟡 row.

**Mirror the existing ScoreStream team search UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Resolve Team: "Washington"                            [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Find a team___________________________] [Clear] [▼]       │
│  Search Filters ▼ | All States - All Organizations         │
│                                                             │
│  3 matches found:                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Logo] Washington High School Eagles                │   │
│  │        Fremont, CA                          [Select]│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Logo] Washington High School Huskies               │   │
│  │        San Francisco, CA                    [Select]│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Logo] Washington Union High School Panthers        │   │
│  │        Fresno, CA                           [Select]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Skip this team]                      [Team not listed]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. API Integration

### 6.1 Endpoint
```
POST https://scorestream.com/api
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "METHOD_NAME",
  "params": { ... },
  "id": 1
}
```

### 6.2 teams.search

**Purpose:** Find matching teams for disambiguation

**Request:**
```typescript
{
  method: "teams.search",
  params: {
    teamName: string,        // Required, 3-256 chars
    city?: string,           // Helps disambiguation
    state?: string,          // 2-letter code
    country?: string,        // Default "US"
    recommendedFor: "addingGames",
    ignoreUserCreatedTeams: true,
    count: 10,
    apiKey: string
  }
}
```

**Response:**
```typescript
{
  result: {
    teamIds: number[],
    total: number,
    collections: {
      teamCollection: {
        list: [{
          teamId: number,
          teamName: string,        // "Oakdale High School"
          mascot1: string,         // "Mustangs"
          city: string,            // "Oakdale"
          state: string,           // "CA"
          minTeamName: string,     // "Oakdale"
          shortTeamName: string,   // "Oakdale High"
          url: string,             // ScoreStream team page
          mascotTeamPictureIds: number[],
          squadIds: number[]
        }]
      },
      teamPictureCollection: {
        list: [{
          teamPictureId: number,
          teamId: number,
          type: "mascot" | "background",
          max90Url: string,        // Thumbnail
          thumbnailUrl: string
        }]
      }
    }
  }
}
```

### 6.3 games.add

**Purpose:** Create a game

**Request:**
```typescript
{
  method: "games.add",
  params: {
    homeTeamId: number,           // Required
    awayTeamId: number,           // Required
    homeSquadId: number,          // Required (see squad table)
    awaySquadId: number,          // Required
    sportName: SportName,         // Required (see enum)
    gameSegmentType: SegmentType, // Required (see enum)
    localStartDateTime?: string,  // ISO format
    localGameTimezone?: string,   // e.g., "America/Los_Angeles"
    duplicateCheckWindow: "large",// 24hr window
    apiKey: string
  }
}
```

**Squad IDs:**
| ID | Level |
|----|-------|
| 1010 | Varsity Boys |
| 1020 | JV Boys |
| 1030 | Freshman Boys |
| 1040 | Varsity Girls |
| 1050 | JV Girls |
| 1060 | Freshman Girls |

**Sport Names:**
`football`, `basketball`, `baseball`, `softball`, `hockey`, `volleyball`, `soccer`, `lacrosse`, `rugby`, `waterpolo`, `fieldhockey`, `ultimatefrisbee`, `wrestling`, `netball`, `handball`, `flagfootball`

**Segment Types:**
| Sport | Default | Options |
|-------|---------|---------|
| football | quarter | quarter, half |
| basketball | quarter | quarter, half |
| baseball | inning-7 | inning-3 to inning-9 |
| softball | inning-7 | inning-5, inning-7 |
| soccer | half | half |
| volleyball | game-5 | game-3, game-5 |
| hockey | period | period |

**Duplicate Handling:**
API automatically checks for existing games matching homeTeam + awayTeam + sport + squad + dateTime. Returns existing game if duplicate found.

---

## 7. Data Models

```typescript
// Application State
interface AppState {
  step: 1 | 2 | 3 | 4 | 5;
  file: File | null;
  rawData: Record<string, string>[];
  headers: string[];
  defaults: {
    sport: SportName;
    squadId: number;
    segmentType: string;
    timezone: string;
  };
  columnMapping: {
    date: string | null;
    time: string | null;
    homeTeam: string | null;
    awayTeam: string | null;
    homeCity?: string | null;
    homeState?: string | null;
    awayCity?: string | null;
    awayState?: string | null;
  };
  games: GameRow[];
  submission: {
    state: "idle" | "submitting" | "complete";
    results: SubmissionResult[];
  };
}

// Single game in the queue
interface GameRow {
  id: string;                    // Unique row ID
  rowIndex: number;              // Original file row
  date: string | null;
  time: string | null;
  homeTeam: TeamResolution;
  awayTeam: TeamResolution;
  status: "ready" | "ambiguous" | "error";
  selected: boolean;
}

// Team resolution state
interface TeamResolution {
  originalText: string;          // Raw text from file
  status: "pending" | "matched" | "ambiguous" | "not_found";
  searchResults?: Team[];        // API results
  selectedTeam?: Team;           // User's selection
  confidence?: number;
}

// Submission result
interface SubmissionResult {
  gameRowId: string;
  status: "created" | "duplicate" | "failed";
  gameId?: number;
  gameUrl?: string;
  error?: string;
}
```

---

## 8. Confidence Scoring (Auto-Match Logic)

```typescript
function calculateConfidence(
  searchTerm: string,
  team: Team,
  inputCity?: string,
  inputState?: string
): number {
  let score = 0;

  // Exact name match
  const searchLower = searchTerm.toLowerCase();
  const teamLower = team.teamName.toLowerCase();
  const minLower = team.minTeamName.toLowerCase();

  if (teamLower === searchLower) score += 40;
  else if (minLower === searchLower) score += 35;
  else if (teamLower.includes(searchLower)) score += 20;

  // Location match
  if (inputState && team.state.toLowerCase() === inputState.toLowerCase()) {
    score += 30;
  }
  if (inputCity && team.city.toLowerCase() === inputCity.toLowerCase()) {
    score += 30;
  }

  return score;
}

// Auto-match rules:
// - If 1 result with confidence >= 70 → Auto-select (🟢)
// - If multiple results → Ambiguous (🟡)
// - If 0 results → Not found (🔴)
```

---

## 9. File Structure

```
/app
  page.tsx                    # Main app with step routing
  layout.tsx                  # Root layout
  globals.css                 # Tailwind + SS design tokens

/components
  /steps
    FileUpload.tsx
    ConfigureDefaults.tsx
    ColumnMapper.tsx
    GameQueue.tsx             # The main review table
    SubmissionResults.tsx
  /ui
    Button.tsx
    Card.tsx
    Dropdown.tsx
    FileDropzone.tsx
    Modal.tsx
    TeamCard.tsx
    StatusBadge.tsx           # 🟢🟡🔴 indicators
  /shared
    Header.tsx
    StepIndicator.tsx

/lib
  api.ts                      # ScoreStream API client
  parsers.ts                  # CSV/Excel parsing
  confidence.ts               # Team matching logic
  constants.ts                # Sports, squads, segments

/types
  index.ts                    # All TypeScript interfaces

/public
  /samples
    sample-basic.csv
    sample-full.csv
```

---

## 10. Claude Code Execution Plan

### Phase 0: Setup
```
Create a new Next.js 14 project with TypeScript and Tailwind CSS.
Read SPEC.md completely before proceeding.
Set up the file structure from Section 9.
Create the design tokens in globals.css from Section 4.1.
```

### Phase 1: API Client + Types
```
Build /lib/api.ts with the ScoreStream API client.
Implement teams.search and games.add functions.
Create all TypeScript interfaces in /types/index.ts.
Create /lib/constants.ts with sports, squads, and segments.
Test the API client with a hardcoded team search.
```

### Phase 2: File Upload + Parsing
```
Build the FileUpload component with drag-and-drop.
Implement CSV parsing with Papa Parse.
Implement Excel parsing with SheetJS.
Show file preview (first 5 rows) after upload.
Validate: 200 row max, 5MB max, correct file types.
```

### Phase 3: Defaults + Column Mapping
```
Build ConfigureDefaults with Sport, Squad, Timezone dropdowns.
Match the dropdown styling from the existing Game Scheduler.
Build ColumnMapper with auto-detection and manual override.
Show preview of mapped values.
```

### Phase 4: The Queue (Core Feature)
```
Build GameQueue table with the traffic light system.
Implement team search and confidence scoring.
Show 🟢🟡🔴 status for each team cell.
Build the Resolution Modal matching the existing team search UI.
Enable row selection and "Schedule X Games" button.
```

### Phase 5: Submission + Results
```
Implement sequential game creation with progress bar.
Handle duplicates gracefully (show existing game link).
Display results table with status and links.
Add "Download Results" CSV export.
```

### Phase 6: Polish
```
Add loading states and error handling throughout.
Ensure responsive design (desktop-first, mobile-usable).
Test with sample CSV files.
Final UI polish to match ScoreStream exactly.
```

---

## 11. Environment Variables

```env
SCORESTREAM_API_URL=https://scorestream.com/api
SCORESTREAM_API_KEY=your_api_key
SCORESTREAM_ACCESS_TOKEN=your_access_token
```

---

## 12. Sample Test Data

### sample-basic.csv
```csv
Date,Time,Home Team,Away Team
09/06/2025,7:00 PM,Oakdale High School,Manteca High School
09/13/2025,7:00 PM,Central Catholic,Oakdale High School
09/20/2025,7:00 PM,Oakdale High School,Downey High School
```

### sample-ambiguous.csv
```csv
Date,Time,Home Team,Home State,Away Team,Away State
09/06/2025,7:00 PM,Washington High School,CA,Lincoln High School,CA
09/13/2025,7:00 PM,Central High School,CA,Washington High School,CA
```

---

## 13. Acceptance Criteria

### Must Have
- [ ] Upload CSV and Excel files (200 rows, 5MB limit)
- [ ] Auto-detect column mappings
- [ ] Configure sport, level, timezone defaults
- [ ] Search ScoreStream API for teams
- [ ] Traffic light status system (🟢🟡🔴)
- [ ] Resolution modal matching existing ScoreStream UI
- [ ] Team logos displayed from API
- [ ] Row selection for partial submission
- [ ] Progress indicator during submission
- [ ] Results with links to created games
- [ ] Duplicate detection (show existing game)
- [ ] Design matches existing ScoreStream UI exactly

### Should Have
- [ ] Download results as CSV
- [ ] Edit individual games inline
- [ ] Filter queue by status
- [ ] Remember last-used defaults (localStorage)

---

## Appendix: UI Screenshot Reference

The existing ScoreStream Game Scheduler (see attached screenshot) shows:
- **Header:** Cyan bar (#29B6F6) with white logo
- **Card:** White background, subtle shadow, rounded corners
- **Title:** "Game Scheduler" - large, centered, light gray
- **Form Layout:** Two-column for team selection
- **Team Search:** "Find a team" input with "Clear" button, "Search Filters" link below
- **Dropdowns:** Light border, chevron indicator, placeholder text
- **Special Buttons:** "BYE" and "TBD" toggles
- **Primary Action:** Blue button bottom-left "Schedule Game"

**Replicate this design language exactly for the Bulk Importer.**

---

*End of Specification*
