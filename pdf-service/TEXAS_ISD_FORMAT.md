# Texas ISD Multi-School PDF Format Support

## Overview

Added support for Texas ISD (Independent School District) multi-school schedule PDFs. These PDFs contain games for multiple schools in a single document, organized in a tabular format.

**Format Example:** Northside ISD Boys Varsity Basketball 2025-26

---

## Format Characteristics

### Structure
- **Multi-school:** One PDF contains schedules for 10-15 schools
- **Tabular format:** Data organized in columns
- **Headers:** Day Of Week, Start Date, Start Time, School Name, Location, Sport, Opponent, Venue Name

### Sample Row
```
Friday | 11/14/2025 | 5:00 PM | Clark HS | Away | Basketball(M) | Westlake High School | WHS University
```

### Key Features
- Each row represents one game for one specific school
- **Location** column indicates Home/Away (unlike MaxPreps @ symbol)
- **School Name** column identifies which school the game belongs to
- Opponent names may include wrapped text, abbreviations, and mascot names
- Tournament games with "TBD" opponents are skipped
- State is always Texas (TX)

---

## Implementation

### 1. Format Detection (`detect_texas_isd_format`)

**Location:** `pdf_service.py:42-56`

**Detection Indicators (need 3+):**
- "Day Of Week" column header
- "School Name" column header
- "VARSITY.*BASKETBALL.*SCHEDULE" in title
- "Start Date.*Start Time" headers
- "Location.*Sport.*Opponent" headers

---

### 2. Extraction (`extract_texas_isd_format`)

**Location:** `pdf_service.py:307-442`

**Method:** Table extraction using `pdfplumber.extract_tables()`

**Process:**
1. Extract tables from all pages
2. Find header row (handle title row if present)
3. Map column indices from headers
4. Parse each data row:
   - Extract date (already in MM/DD/YYYY format)
   - Extract time (handle TBA)
   - Extract school name
   - Extract and clean opponent name
   - Determine home/away based on Location column
5. Group games by school name
6. Return first school found (or specified school if filter provided)

**Opponent Name Cleaning:**
- Remove newlines and extra whitespace
- Strip mascot names (Tigers, Eagles, Warriors, etc.)
- Remove abbreviations at end (e.g., "WHS", "CHS")
- Remove duplicate school names (e.g., "United HS United" → "United HS")

---

### 3. Routing Logic

**Location:** `pdf_service.py:560-569`

**Detection Order:**
1. Schedule Star format
2. **Texas ISD format** (NEW)
3. MaxPreps format (default)
4. Table fallback

---

## Sample Output

### Test PDF: `varsity-boys-basketball-25-26.pdf`

```json
{
  "success": true,
  "mainTeam": "Clark HS",
  "mainCity": null,
  "mainState": "TX",
  "gameCount": 21,
  "availableSchools": [
    "Clark HS",
    "Holmes HS",
    "Sotomayor HS",
    "Stevens HS",
    "Warren HS",
    "Brandeis HS",
    "Marshall HS",
    "O'Connor HS",
    "Taft HS",
    "Jay HS",
    "Brennan HS",
    "Harlan HS"
  ],
  "games": [
    {
      "date": "11/14/2025",
      "time": "5:00 PM",
      "homeTeam": "Westlake High School",
      "awayTeam": "Clark HS",
      "homeCity": null,
      "homeState": null,
      "awayCity": null,
      "awayState": "TX",
      "homeScore": null,
      "awayScore": null,
      "isCompleted": false
    }
  ]
}
```

---

## Key Differences from Other Formats

| Feature | MaxPreps | Schedule Star | Texas ISD |
|---------|----------|---------------|-----------|
| **Schools per PDF** | 1 | 1 | Multiple (10-15) |
| **Format** | Text lines | Text lines | Tables |
| **Home/Away** | @ symbol | Home/Away text | Location column |
| **Date Format** | M/D | MM/DD/YY | MM/DD/YYYY |
| **City/State** | Included | Not included | State only (TX) |
| **Opponent Data** | (City, ST) | None | None |
| **Extraction Method** | Regex | Regex | Table parsing |

---

## Usage

### Default Behavior
- Extracts **first school** found in the PDF
- Returns games for that school only

### Example: Clark HS from Northside ISD PDF
- PDF contains 12 schools
- First school: Clark HS
- Extracted: 21 games for Clark HS
- Metadata includes list of all 12 schools

### Future Enhancement
Add `school_filter` parameter to `/extract` endpoint:
```python
POST /extract?school=Holmes%20HS
```
This would allow users to select which school to extract from multi-school PDFs.

---

## Test Results ✅

### Detection
✅ Correctly identifies Texas ISD format
✅ Does not false-positive on MaxPreps or Schedule Star PDFs

### Extraction
✅ **Clark HS**: 21 games extracted
✅ **12 schools** available in PDF
✅ Opponent names cleaned properly
✅ Home/Away assignment correct
✅ Dates in MM/DD/YYYY format
✅ Times normalized (e.g., "5:00 PM")
✅ TBA times handled (set to null)
✅ Tournament games skipped (TBD opponents)

### No Regression
✅ **MaxPreps**: Colton HS - 25 games ✓
✅ **Schedule Star**: Goshen HS - 19 games ✓
✅ **Texas ISD**: Clark HS - 21 games ✓

---

## Edge Cases Handled

1. **Title row in table**: Detects and skips "BOYS VARSITY BASKETBALL SCHEDULE" row
2. **Wrapped opponent names**: Cleans "Westlake High\nSchool WHS" → "Westlake High School"
3. **Mascot names**: Removes "Knights", "Tigers", "Cougars", etc.
4. **Abbreviations**: Strips trailing "WHS", "CHS", etc.
5. **Duplicate names**: Cleans "United HS United" → "United HS"
6. **TBA times**: Converts to null
7. **Tournament games**: Skips games with "TBD", "Tournament", "Classic", "Invitational"
8. **Multiple schools**: Groups games by school, returns first school

---

## Files Modified

**`pdf-service/pdf_service.py`**
- Added `detect_texas_isd_format()` (lines 42-56)
- Added `extract_texas_isd_format()` (lines 307-442)
- Updated routing logic (lines 560-569)

**No other files changed** - maintains compatibility with existing frontend.

---

## Sample Schools Extracted

From Northside ISD PDF (12 schools total):
1. Clark HS - 21 games
2. Holmes HS
3. Sotomayor HS
4. Stevens HS
5. Warren HS
6. Brandeis HS
7. Marshall HS
8. O'Connor HS
9. Taft HS
10. Jay HS
11. Brennan HS
12. Harlan HS

---

## Future Enhancements

1. **School Selection UI**
   - Let user pick which school(s) to import
   - Show all available schools after upload
   - Multi-select for importing multiple schools

2. **Query Parameter**
   - Add `?school=` parameter to `/extract` endpoint
   - Allow backend school filtering

3. **Batch Import**
   - Extract all schools at once
   - Return as array of schedules

4. **ISD Detection**
   - Extract ISD name from PDF title
   - Group schools by district

---

## Summary

✅ **Texas ISD format supported**
✅ **Multi-school PDFs handled**
✅ **Table-based extraction**
✅ **Opponent name cleaning**
✅ **All 3 formats working**
✅ **No regressions**

**Ready for production use!**
