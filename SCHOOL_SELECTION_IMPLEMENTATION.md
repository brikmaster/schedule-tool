# School Selection for Multi-School PDFs - Implementation Guide

## Overview

Implemented school selection feature for Texas ISD multi-school PDFs. Users can now choose which school to import from PDFs containing multiple schools.

---

## User Flow

### Step 1: Upload Texas ISD PDF
User uploads a PDF (e.g., `varsity-boys-basketball-25-26.pdf`)

### Step 2: School Selection UI Appears
- System detects 12 schools in the PDF
- Shows dropdown with all available schools
- Each school displays game count

```
Multiple Schools Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━
This PDF contains schedules for 12 schools.
Please select which school you want to import:

[Select School ▼]
  -- Choose a school --
  Clark HS (21 games)
  Holmes HS (21 games)
  Sotomayor HS (22 games)
  ...

[Import Selected School] [Cancel]
```

### Step 3: User Selects School
User picks "Holmes HS" from dropdown

### Step 4: Games Extracted
- System re-processes PDF with selected school
- Extracts 21 games for Holmes HS only
- Proceeds to Configure Defaults step

---

## Implementation Details

### Backend Changes

#### 1. Updated `/extract` Endpoint
**File:** `pdf-service/pdf_service.py`

**Added optional `school` query parameter:**
```python
@app.post("/extract")
async def extract_schedule(file: UploadFile = File(...), school: Optional[str] = None):
```

**New flow:**
- If Texas ISD + no `school` param → return school list
- If Texas ISD + `school` param → extract games for that school

#### 2. Updated `extract_texas_isd_format()`
**File:** `pdf-service/pdf_service.py:307-442`

**Response when no school selected:**
```json
{
  "success": true,
  "requiresSchoolSelection": true,
  "availableSchools": [
    {"name": "Clark HS", "gameCount": 21},
    {"name": "Holmes HS", "gameCount": 21},
    ...
  ],
  "mainTeam": null,
  "games": [],
  "gameCount": 0
}
```

**Response when school selected:**
```json
{
  "success": true,
  "mainTeam": "Holmes HS",
  "mainState": "TX",
  "gameCount": 21,
  "availableSchools": [...],
  "games": [...]
}
```

#### 3. Updated Validation Logic
**File:** `pdf-service/pdf_service.py:648-658`

Skip "No games found" error when `requiresSchoolSelection: true`

---

### Frontend Changes

#### 1. Updated FileUpload Component
**File:** `components/steps/FileUpload.tsx`

**New state:**
```typescript
const [availableSchools, setAvailableSchools] = useState<AvailableSchool[]>([]);
const [selectedSchool, setSelectedSchool] = useState<string>("");
const [pendingFile, setPendingFile] = useState<File | null>(null);
```

**Detection logic:**
```typescript
if (result.requiresSchoolSelection && result.availableSchools) {
  setAvailableSchools(result.availableSchools);
  setPendingFile(file);
  return; // Wait for user selection
}
```

**School selection handler:**
```typescript
const handleSchoolSelection = async () => {
  if (!selectedSchool || !pendingFile) return;
  await handleFileSelect(pendingFile, selectedSchool);
  // Clear state after selection
};
```

#### 2. School Selection UI
**Blue info box with:**
- Title: "Multiple Schools Detected"
- Dropdown showing all schools with game counts
- "Import" button (disabled until school selected)
- "Cancel" button

#### 3. Updated API Route
**File:** `app/api/process-pdf/route.ts`

**Pass school parameter through:**
```typescript
const school = searchParams.get("school");
const url = school
  ? `${PDF_SERVICE_URL}/extract?school=${encodeURIComponent(school)}`
  : `${PDF_SERVICE_URL}/extract`;
```

---

## Testing

### Backend Tests

**Test 1: Without school parameter**
```bash
curl -X POST -F "file=@varsity-boys-basketball-25-26.pdf" http://localhost:8001/extract
```

**Result:**
```json
{
  "success": true,
  "requiresSchoolSelection": true,
  "availableSchools": [
    {"name": "Clark HS", "gameCount": 21},
    {"name": "Holmes HS", "gameCount": 21},
    {"name": "Sotomayor HS", "gameCount": 22},
    ...12 total schools
  ],
  "games": [],
  "gameCount": 0
}
```

**Test 2: With school parameter**
```bash
curl -X POST -F "file=@varsity-boys-basketball-25-26.pdf" \
  "http://localhost:8001/extract?school=Holmes%20HS"
```

**Result:**
```json
{
  "success": true,
  "mainTeam": "Holmes HS",
  "mainState": "TX",
  "gameCount": 21,
  "games": [21 games for Holmes HS]
}
```

### Frontend Test (Manual)

1. **Navigate to** http://localhost:3000
2. **Upload** `varsity-boys-basketball-25-26.pdf`
3. **Verify** school selection UI appears
4. **Check** dropdown shows 12 schools with game counts
5. **Select** "Holmes HS (21 games)"
6. **Click** "Import Holmes HS"
7. **Verify** 21 games load into queue
8. **Confirm** proceeds to Configure Defaults step

---

## Files Modified

### Backend
1. **`pdf-service/pdf_service.py`**
   - Line 531: Added `school` parameter to `/extract` endpoint
   - Line 565: Pass school filter to Texas ISD extractor
   - Line 648-658: Skip validation when school selection required
   - Line 390-442: Return school list when no school selected

### Frontend
1. **`components/steps/FileUpload.tsx`**
   - Added school selection state variables
   - Updated `handleFileSelect` to handle school parameter
   - Added `handleSchoolSelection` function
   - Added school selection UI (lines 164-217)
   - Updated reset logic to clear school state

2. **`app/api/process-pdf/route.ts`**
   - Extract `school` query parameter
   - Pass to PDF service URL

---

## Supported Scenarios

### Scenario 1: Single-School PDF (MaxPreps, Schedule Star)
- **Behavior:** Works as before, no school selection needed
- **Flow:** Upload → Extract → Configure Defaults

### Scenario 2: Multi-School PDF (Texas ISD) - First Time
- **Behavior:** Show school selection UI
- **Flow:** Upload → Select School → Extract → Configure Defaults

### Scenario 3: Multi-School PDF (Texas ISD) - With Direct School
- **Behavior:** If school param provided, skip selection
- **Flow:** Upload with ?school=X → Extract → Configure Defaults

---

## Example: Real Data

**PDF:** Northside ISD Boys Varsity Basketball 2025-26

**Available Schools:**
```
1. Clark HS - 21 games
2. Holmes HS - 21 games
3. Sotomayor HS - 22 games
4. Stevens HS - 22 games
5. Warren HS - 21 games
6. Brandeis HS - 24 games
7. Marshall HS - 24 games
8. O'Connor HS - 23 games
9. Taft HS - 21 games
10. Jay HS - 21 games
11. Brennan HS - 19 games
12. Harlan HS - 17 games
```

**Total Games in PDF:** 256 games across all schools

**User Selection:** Holmes HS

**Extracted:** 21 games for Holmes HS only

**Sample Games:**
```
11/14/2025  5:30 PM   HOME vs Smithson Valley
11/15/2025 12:30 PM   AWAY vs L.E.E.
11/18/2025  8:00 PM   HOME vs Alamo Heights High School Mules
```

---

## Future Enhancements

### 1. Multi-Select Import
Allow importing multiple schools at once:
```
☑ Clark HS (21 games)
☑ Holmes HS (21 games)
☐ Sotomayor HS (22 games)
...
[Import 2 Selected Schools]
```

### 2. Remember Last Selection
Store last selected school per PDF filename in localStorage

### 3. School Search/Filter
Add search box for large lists (15+ schools):
```
[Search schools... 🔍]
  Holmes HS (21 games)
  Holmes Middle School (15 games)
```

### 4. Batch Import All
Add "Import All Schools" button to create separate queues for each

### 5. Preview Games Before Selection
Show first 3 games for each school in the selection dropdown

---

## Error Handling

### School Not Found
If selected school doesn't exist in PDF:
```json
{
  "success": false,
  "error": "School 'XYZ HS' not found in PDF",
  "availableSchools": [...]
}
```

### Invalid School Parameter
- Frontend validates selection before submitting
- Backend returns error if school doesn't match any in PDF

### PDF Service Unavailable
- Standard error handling (503 Service Unavailable)
- Suggests checking if Python service is running

---

## Summary

✅ **School selection implemented**
✅ **Works with Texas ISD multi-school PDFs**
✅ **Clean UI with dropdown selection**
✅ **Backend validates school exists**
✅ **No regression on single-school PDFs**
✅ **All 3 PDF formats supported**

**Ready for production use!**

### Services Running:
- **PDF Service**: http://localhost:8001 ✓
- **Next.js Frontend**: http://localhost:3000 ✓

### Test It Now:
1. Go to http://localhost:3000
2. Upload `varsity-boys-basketball-25-26.pdf`
3. Select a school from the dropdown
4. Import and enjoy! 🎉
