// Team Matching Confidence Scoring

import { Team, TeamResolution } from "@/types";

export const CONFIDENCE_THRESHOLD = 70;

export function calculateConfidence(
  searchTerm: string,
  team: Team,
  inputCity?: string,
  inputState?: string
): number {
  let score = 0;

  // Exact name match (0-40 points)
  const searchLower = searchTerm.toLowerCase().trim();
  const teamLower = team.teamName.toLowerCase();
  const minLower = team.minTeamName.toLowerCase();
  const shortLower = team.shortTeamName?.toLowerCase() || "";

  if (teamLower === searchLower || minLower === searchLower) {
    score += 40;
  } else if (shortLower === searchLower) {
    score += 35;
  } else if (teamLower.includes(searchLower) || searchLower.includes(minLower)) {
    score += 20;
  } else if (minLower.includes(searchLower.split(" ")[0])) {
    score += 15;
  }

  // Location match (0-60 points)
  if (inputState && team.state.toLowerCase() === inputState.toLowerCase()) {
    score += 30;
  }
  if (inputCity && team.city.toLowerCase() === inputCity.toLowerCase()) {
    score += 30;
  }

  return Math.min(score, 100);
}

export function autoMatchTeam(
  searchResults: Team[],
  searchTerm: string,
  city?: string,
  state?: string
): TeamResolution {
  if (searchResults.length === 0) {
    return {
      originalText: searchTerm,
      status: "not_found",
      searchResults: [],
    };
  }

  const withConfidence = searchResults.map((team) => ({
    team,
    confidence: calculateConfidence(searchTerm, team, city, state),
  }));

  const sorted = withConfidence.sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];

  // Auto-match if single result (regardless of confidence - only 1 option!)
  if (sorted.length === 1) {
    return {
      originalText: searchTerm,
      status: "matched",
      selectedTeam: best.team,
      confidence: best.confidence,
      searchResults,
    };
  }

  // Auto-match if multiple results but one has very high confidence
  if (sorted.length > 1 && best.confidence >= CONFIDENCE_THRESHOLD) {
    return {
      originalText: searchTerm,
      status: "matched",
      selectedTeam: best.team,
      confidence: best.confidence,
      searchResults,
    };
  }

  // Ambiguous - multiple results with no clear winner
  return {
    originalText: searchTerm,
    status: "ambiguous",
    searchResults,
    confidence: best.confidence,
  };
}

