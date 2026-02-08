// Team Name Normalizer - Standardize team name suffixes for better matching

/**
 * City abbreviation mappings for slash-separated names
 * e.g., "Santiago/C" -> "Santiago Corona", "Poly/LB" -> "Poly Long Beach"
 */
const CITY_ABBREVIATIONS: Record<string, string> = {
  '/C': ' Corona',
  '/OC': ' Orange County',
  '/LB': ' Long Beach',
  '/O': ' Orange',
  '/LA': ' Los Angeles',
  '/SB': ' Santa Barbara',
  '/SD': ' San Diego',
  '/SF': ' San Francisco',
  '/IE': ' Inland Empire',
  '/SJ': ' San Jose',
  '/VC': ' Ventura County',
};

/**
 * Common team name suffix patterns and their normalized forms
 */
const SUFFIX_PATTERNS = [
  // Jr/Sr (Junior/Senior) High School variations - must come before other patterns
  { pattern: /\bJr\.?\/Sr\.?\s+H\.?S\.?\b/gi, normalized: 'High School' },
  { pattern: /\bJr\.?\/Sr\.?\s+High School\b/gi, normalized: 'High School' },
  { pattern: /\bJr\.?-Sr\.?\s+H\.?S\.?\b/gi, normalized: 'High School' },
  { pattern: /\bJunior\/Senior\s+High School\b/gi, normalized: 'High School' },

  // High School variations
  { pattern: /\bH\.?S\.?\b/gi, normalized: 'High School' },
  { pattern: /\bHigh Sch\b/gi, normalized: 'High School' },
  { pattern: /\bHi Sch\b/gi, normalized: 'High School' },
  { pattern: /\bHigh\b$/gi, normalized: 'High School' },

  // Junior High variations
  { pattern: /\bJ\.?H\.?S\.?\b/gi, normalized: 'Junior High School' },
  { pattern: /\bJr\.? High\b/gi, normalized: 'Junior High School' },
  { pattern: /\bJunior High\b/gi, normalized: 'Junior High School' },

  // Middle School variations
  { pattern: /\bM\.?S\.?\b/gi, normalized: 'Middle School' },
  { pattern: /\bMid\.? Sch\b/gi, normalized: 'Middle School' },

  // Elementary variations
  { pattern: /\bElem\b/gi, normalized: 'Elementary School' },
  { pattern: /\bEl\.? Sch\b/gi, normalized: 'Elementary School' },

  // Academy variations
  { pattern: /\bAcad\b/gi, normalized: 'Academy' },
  { pattern: /\bAca\b/gi, normalized: 'Academy' },

  // Preparatory variations
  { pattern: /\bPrep\b/gi, normalized: 'Preparatory' },

  // Christian variations
  { pattern: /\bChr\b/gi, normalized: 'Christian' },
];

/**
 * Common words to remove for core name matching
 */
const NOISE_WORDS = new Set([
  'the', 'of', 'and', 'at', 'in', 'for',
]);

/**
 * Normalizes a team name by standardizing suffixes and removing annotations
 * Examples:
 *   "Oakdale HS" -> "Oakdale High School"
 *   "Sierra H.S." -> "Sierra High School"
 *   "Lincoln JHS" -> "Lincoln Junior High School"
 *   '"Oakdale HS"' -> "Oakdale High School"
 *   "Batavia HS (Coming Home )" -> "Batavia High School"
 *   "Milford High School (@ Cleveland)" -> "Milford High School"
 *   "Loveland Jr/Sr HS" -> "Loveland High School"
 *   "Springfield Jr./Sr. High School" -> "Springfield High School"
 *   "Santiago/C" -> "Santiago Corona"
 *   "Poly/LB" -> "Poly Long Beach"
 *   "Pacifica Chr/OC" -> "Pacifica Christian Orange County"
 *   "Lutheran/O" -> "Lutheran Orange"
 */
export function normalizeTeamName(name: string): string {
  let normalized = name.trim();

  // Remove surrounding quotes (single or double)
  normalized = normalized.replace(/^["']|["']$/g, '');

  // Trim again after removing quotes
  normalized = normalized.trim();

  // Remove parenthetical content (e.g., "(Coming Home)", "(@ Cleveland)", "(Senior Night)")
  // This handles event notes, location notes, and other annotations
  normalized = normalized.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Expand city abbreviations (e.g., "Santiago/C" -> "Santiago Corona")
  // Must come before suffix patterns to preserve order
  for (const [abbrev, expansion] of Object.entries(CITY_ABBREVIATIONS)) {
    const pattern = new RegExp(abbrev.replace('/', '\\/') + '\\b', 'gi');
    normalized = normalized.replace(pattern, expansion);
  }

  // Apply all suffix pattern replacements (including Chr -> Christian)
  for (const { pattern, normalized: replacement } of SUFFIX_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Clean up multiple spaces and trailing punctuation
  normalized = normalized.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/\.$/, ''); // Remove trailing period
  normalized = normalized.replace(/\bSchool\s+School\b/gi, 'School'); // Fix double "School"

  return normalized;
}

/**
 * Extracts the core name by removing common suffixes entirely
 * Used for fuzzy matching when you want to compare just the base name
 * Examples:
 *   "Oakdale High School" -> "Oakdale"
 *   "Sierra HS" -> "Sierra"
 *   "Lincoln Academy" -> "Lincoln"
 *   "Wildwood Middle High School" -> "Wildwood"
 */
export function extractCoreName(name: string): string {
  // First normalize the name
  const normalized = normalizeTeamName(name);

  // Remove common school type suffixes (order matters - longest first)
  const suffixesToRemove = [
    /\bMiddle High School\b/gi,      // Combined suffix (e.g., Wildwood Middle High School)
    /\bJunior High School\b/gi,
    /\bElementary School\b/gi,
    /\bHigh School\b/gi,
    /\bMiddle School\b/gi,
    /\bPreparatory School\b/gi,
    /\bPreparatory\b/gi,
    /\bAcademy\b/gi,
    /\bSchool\b/gi,
  ];

  let coreName = normalized;
  for (const suffix of suffixesToRemove) {
    coreName = coreName.replace(suffix, '');
  }

  // Clean up and return
  return coreName.trim();
}

/**
 * Removes noise words and normalizes for comparison
 * Examples:
 *   "The Oakdale High School" -> "oakdale high school"
 *   "Sierra HS" -> "sierra high school"
 */
export function normalizeForComparison(name: string): string {
  const normalized = normalizeTeamName(name).toLowerCase();

  // Remove noise words
  const words = normalized.split(/\s+/);
  const filtered = words.filter(word => !NOISE_WORDS.has(word));

  return filtered.join(' ');
}

/**
 * Checks if two team names match after normalization
 */
export function areTeamNamesEquivalent(name1: string, name2: string): boolean {
  return normalizeForComparison(name1) === normalizeForComparison(name2);
}

/**
 * Extracts the primary keyword (usually the first significant word)
 * Examples:
 *   "Wildwood High School" -> "wildwood"
 *   "The Oakdale HS" -> "oakdale"
 */
function extractPrimaryKeyword(name: string): string {
  const core = extractCoreName(name).toLowerCase().trim();
  const words = core.split(/\s+/).filter(w => w.length > 2 && !NOISE_WORDS.has(w));
  return words[0] || '';
}

/**
 * Calculates similarity score between two team names (0-100)
 * Uses multiple strategies:
 * - Exact match after normalization: 100
 * - Core name match: 80
 * - Primary keyword match: 70
 * - One contains the other: 60
 * - Partial word match: 40-60
 */
export function calculateNameSimilarity(searchTerm: string, teamName: string): number {
  const search = normalizeForComparison(searchTerm);
  const team = normalizeForComparison(teamName);

  // Exact match after normalization
  if (search === team) {
    return 100;
  }

  // Core name match (without suffixes)
  const searchCore = extractCoreName(searchTerm).toLowerCase().trim();
  const teamCore = extractCoreName(teamName).toLowerCase().trim();

  if (searchCore && teamCore && searchCore === teamCore) {
    return 80;
  }

  // Primary keyword match (e.g., "Wildwood" in both "Wildwood HS" and "Wildwood Middle High School")
  const searchKeyword = extractPrimaryKeyword(searchTerm);
  const teamKeyword = extractPrimaryKeyword(teamName);

  if (searchKeyword && teamKeyword && searchKeyword === teamKeyword && searchKeyword.length >= 4) {
    return 70;
  }

  // One contains the other
  if (team.includes(search) || search.includes(team)) {
    return 60;
  }

  // Check if all words in search term appear in team name
  const searchWords = search.split(/\s+/).filter(w => w.length > 2);
  const teamWords = team.split(/\s+/);

  if (searchWords.length > 0) {
    const matchedWords = searchWords.filter(word =>
      teamWords.some(tw => tw.includes(word) || word.includes(tw))
    );

    const matchRatio = matchedWords.length / searchWords.length;
    if (matchRatio >= 0.8) {
      return 60;
    } else if (matchRatio >= 0.5) {
      return 40;
    }
  }

  return 0;
}
