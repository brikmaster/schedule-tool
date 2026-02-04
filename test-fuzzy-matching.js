// Quick test script for fuzzy team name matching
// Run with: node test-fuzzy-matching.js

// Mock the functions since we can't import TypeScript directly
function normalizeTeamName(name) {
  const SUFFIX_PATTERNS = [
    { pattern: /\bH\.?S\.?\b/gi, normalized: 'High School' },
    { pattern: /\bHigh Sch\b/gi, normalized: 'High School' },
    { pattern: /\bHi Sch\b/gi, normalized: 'High School' },
    { pattern: /\bHigh\b$/gi, normalized: 'High School' },
    { pattern: /\bJ\.?H\.?S\.?\b/gi, normalized: 'Junior High School' },
    { pattern: /\bJr\.? High\b/gi, normalized: 'Junior High School' },
    { pattern: /\bJunior High\b/gi, normalized: 'Junior High School' },
    { pattern: /\bM\.?S\.?\b/gi, normalized: 'Middle School' },
    { pattern: /\bMid\.? Sch\b/gi, normalized: 'Middle School' },
    { pattern: /\bElem\b/gi, normalized: 'Elementary School' },
    { pattern: /\bEl\.? Sch\b/gi, normalized: 'Elementary School' },
    { pattern: /\bAcad\b/gi, normalized: 'Academy' },
    { pattern: /\bPrep\b/gi, normalized: 'Preparatory' },
  ];

  let normalized = name.trim();

  // Remove surrounding quotes (single or double)
  normalized = normalized.replace(/^["']|["']$/g, '');

  // Trim again after removing quotes
  normalized = normalized.trim();

  for (const { pattern, normalized: replacement } of SUFFIX_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }
  normalized = normalized.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/\.$/, ''); // Remove trailing period
  normalized = normalized.replace(/\bSchool\s+School\b/gi, 'School'); // Fix double "School"
  return normalized;
}

function extractCoreName(name) {
  const normalized = normalizeTeamName(name);
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
  return coreName.trim();
}

function extractPrimaryKeyword(name) {
  const NOISE_WORDS = new Set(['the', 'of', 'and', 'at', 'in', 'for']);
  const core = extractCoreName(name).toLowerCase().trim();
  const words = core.split(/\s+/).filter(w => w.length > 2 && !NOISE_WORDS.has(w));
  return words[0] || '';
}

function normalizeForComparison(name) {
  const normalized = normalizeTeamName(name).toLowerCase();
  const NOISE_WORDS = new Set(['the', 'of', 'and', 'at', 'in', 'for']);
  const words = normalized.split(/\s+/);
  const filtered = words.filter(word => !NOISE_WORDS.has(word));
  return filtered.join(' ');
}

function calculateNameSimilarity(searchTerm, teamName) {
  const search = normalizeForComparison(searchTerm);
  const team = normalizeForComparison(teamName);

  if (search === team) {
    return 100;
  }

  const searchCore = extractCoreName(searchTerm).toLowerCase().trim();
  const teamCore = extractCoreName(teamName).toLowerCase().trim();

  if (searchCore && teamCore && searchCore === teamCore) {
    return 80;
  }

  // Primary keyword match
  const searchKeyword = extractPrimaryKeyword(searchTerm);
  const teamKeyword = extractPrimaryKeyword(teamName);

  if (searchKeyword && teamKeyword && searchKeyword === teamKeyword && searchKeyword.length >= 4) {
    return 70;
  }

  if (team.includes(search) || search.includes(team)) {
    return 60;
  }

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

function calculateConfidence(searchTerm, team, inputCity, inputState) {
  let score = 0;

  const teamNameSimilarity = calculateNameSimilarity(searchTerm, team.teamName);
  const minNameSimilarity = calculateNameSimilarity(searchTerm, team.minTeamName);
  const shortNameSimilarity = team.shortTeamName
    ? calculateNameSimilarity(searchTerm, team.shortTeamName)
    : 0;

  const bestSimilarity = Math.max(teamNameSimilarity, minNameSimilarity, shortNameSimilarity);
  score += Math.round((bestSimilarity / 100) * 40);

  if (inputState && team.state.toLowerCase() === inputState.toLowerCase()) {
    score += 30;
  }
  if (inputCity && team.city.toLowerCase() === inputCity.toLowerCase()) {
    score += 30;
  }

  return Math.min(score, 100);
}

// Test cases
console.log('=== Fuzzy Team Name Matching Tests ===\n');

const testCases = [
  {
    search: 'Oakdale HS',
    team: {
      teamName: 'Oakdale High School',
      minTeamName: 'Oakdale',
      shortTeamName: 'Oakdale',
      city: 'Oakdale',
      state: 'CA'
    },
    city: 'Oakdale',
    state: 'CA',
    expectedScore: '≥70 (should auto-match)'
  },
  {
    search: 'Sierra H.S.',
    team: {
      teamName: 'Sierra High School',
      minTeamName: 'Sierra',
      shortTeamName: 'Sierra',
      city: 'Manteca',
      state: 'CA'
    },
    city: 'Manteca',
    state: 'CA',
    expectedScore: '≥70 (should auto-match)'
  },
  {
    search: 'Wildwood HS',
    team: {
      teamName: 'Wildwood Middle High School',
      minTeamName: 'Wildwood',
      shortTeamName: 'Wildwood',
      city: 'Wildwood',
      state: 'FL'
    },
    city: null,
    state: 'FL',
    expectedScore: '≥70 (keyword match + state)'
  },
  {
    search: 'Lincoln HS',
    team: {
      teamName: 'Lincoln High School',
      minTeamName: 'Lincoln',
      shortTeamName: null,
      city: 'Stockton',
      state: 'CA'
    },
    city: null,
    state: null,
    expectedScore: '32-40 (just name match, no location)'
  },
  {
    search: 'The Oakdale High',
    team: {
      teamName: 'Oakdale High School',
      minTeamName: 'Oakdale',
      shortTeamName: 'Oakdale',
      city: 'Oakdale',
      state: 'CA'
    },
    city: null,
    state: 'CA',
    expectedScore: '≥62 (normalized name + state match)'
  }
];

testCases.forEach((test, idx) => {
  console.log(`Test ${idx + 1}: "${test.search}" vs "${test.team.teamName}"`);

  const nameSim = calculateNameSimilarity(test.search, test.team.teamName);
  const confidence = calculateConfidence(test.search, test.team, test.city, test.state);

  console.log(`  Name Similarity: ${nameSim}%`);
  console.log(`  Overall Confidence: ${confidence}`);
  console.log(`  Expected: ${test.expectedScore}`);
  console.log(`  ${confidence >= 70 ? '✓ WOULD AUTO-MATCH' : '✗ Would be ambiguous'}\n`);
});

console.log('=== Normalization Examples ===\n');
const normalizations = [
  'Oakdale HS',
  '"Oakdale HS"',
  'Sierra H.S.',
  '"Sierra H.S."',
  'Lincoln High',
  'Washington JHS',
  'Jefferson M.S.',
  'Roosevelt Elem',
  'Kennedy Prep',
  "'Manteca HS'",
];

normalizations.forEach(name => {
  console.log(`"${name}"`);
  console.log(`  → Normalized: "${normalizeTeamName(name)}"`);
  console.log(`  → Core Name: "${extractCoreName(name)}"\n`);
});
