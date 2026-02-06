# Fuzzy Matching Updates Summary

## Recent Fixes

### 1. Parenthetical Content Removal ✅
**Problem:** Team names like "Batavia HS (Coming Home )" were causing errors.

**Solution:** Strip out parenthetical annotations before matching:
- `(Coming Home )` → removed
- `(@ Cleveland)` → removed
- `(Youth Night)` → removed
- `(Senior Night)` → removed

**Result:** `"Batavia HS (Coming Home )"` → `"Batavia High School"` → 100/100 match

---

### 2. Jr/Sr Notation Handling ✅
**Problem:** "Loveland Jr/Sr HS" was showing errors.

**Solution:** Added patterns to normalize Jr/Sr (Junior/Senior) combined schools:
- `Jr/Sr HS` → `High School`
- `Jr./Sr. HS` → `High School`
- `Junior/Senior High School` → `High School`

**Normalization Examples:**
- `"Loveland Jr/Sr HS"` → `"Loveland High School"` → Core: `"Loveland"`
- `"Springfield Jr./Sr. HS"` → `"Springfield High School"` → Core: `"Springfield"`

---

## How Ambiguous Matching Works

### Confidence Scoring (0-100 points)
- **Name Match:** 0-40 points (based on fuzzy similarity)
- **City Match:** +30 points
- **State Match:** +30 points
- **Threshold:** 70 points (auto-match if ≥70)

### "Loveland Jr/Sr HS" Example

#### Scenario 1: Schedule Star PDF (No City/State)
**Input:** `"Loveland Jr/Sr HS"`, City: `undefined`, State: `undefined`

| Team | Name Score | City Score | State Score | Total | Result |
|------|-----------|-----------|-------------|-------|--------|
| Loveland High School | 40 | 0 | 0 | **40** | Below threshold |
| Loveland Senior High School | 28 | 0 | 0 | **28** | Below threshold |

**Result:** `ambiguous` → User prompted to choose ✅

---

#### Scenario 2: MaxPreps PDF (Has City/State)
**Input:** `"Loveland Jr/Sr HS"`, City: `"Loveland"`, State: `"OH"`

| Team | Name Score | City Score | State Score | Total | Result |
|------|-----------|-----------|-------------|-------|--------|
| Loveland High School | 40 | 30 | 30 | **100** | Auto-match! |
| Loveland Senior High School | 28 | 30 | 30 | **88** | Lower confidence |

**Result:** `matched` → Auto-selects "Loveland High School" ✅

---

## User Experience

### For Schedule Star PDFs
- Opponent teams have **no city/state** data
- Teams like "Loveland Jr/Sr HS" will:
  1. Be normalized to "Loveland High School"
  2. Search database for "Loveland" schools
  3. If multiple found → marked **ambiguous**
  4. User sees dropdown to select correct school ✅

### For MaxPreps PDFs
- Opponent teams **include city/state** data
- Higher confidence scores (up to 100 points)
- More auto-matches (≥70 threshold)
- Less user intervention needed ✅

---

## Test Results

### Normalization Tests ✅
```
"Batavia HS (Coming Home )" → "Batavia High School"
"Loveland Jr/Sr HS" → "Loveland High School"
"Milford High School (@ Cleveland)" → "Milford High School"
"Bishop Fenwick HS (Youth Night)" → "Bishop Fenwick High School"
```

### Similarity Scores ✅
```
"Batavia HS (Coming Home )" vs "Batavia High School" → 100/100
"Loveland Jr/Sr HS" vs "Loveland High School" → 100/100
"Loveland Jr/Sr HS" vs "Loveland Senior HS" → 70/100
```

### Ambiguous Handling ✅
- Without location data: 40/100 (below 70) → **ambiguous**
- With location data: 100/100 (above 70) → **auto-matched**

---

## Files Modified

1. **`lib/utils/teamNameNormalizer.ts`**
   - Added parenthetical content removal
   - Added Jr/Sr notation patterns
   - Updated documentation

2. **`lib/confidence.ts`**
   - Already had ambiguous handling
   - No changes needed
   - Works perfectly with updated normalizer

---

## Summary

✅ **Parentheses handled** - Event notes stripped before matching
✅ **Jr/Sr normalized** - Combined schools match correctly
✅ **Ambiguous detection** - Multiple matches prompt user
✅ **Core name extraction** - "Loveland Jr/Sr HS" → "Loveland"
✅ **Location boosting** - City/state data improves confidence

**Result:** Loveland Jr/Sr HS no longer shows errors and will present options to user when ambiguous!
