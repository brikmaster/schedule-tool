// Team Matching Confidence Scoring

import { Team, TeamResolution } from "@/types";
import { calculateNameSimilarity } from "@/lib/utils/teamNameNormalizer";

export const CONFIDENCE_THRESHOLD = 70;

export function calculateConfidence(
  searchTerm: string,
  team: Team,
  inputCity?: string,
  inputState?: string
): number {
  let score = 0;

  // Name matching with fuzzy logic (0-50 points)
  // Try matching against teamName, minTeamName, and shortTeamName
  const teamNameSimilarity = calculateNameSimilarity(searchTerm, team.teamName);
  const minNameSimilarity = calculateNameSimilarity(searchTerm, team.minTeamName);
  const shortNameSimilarity = team.shortTeamName
    ? calculateNameSimilarity(searchTerm, team.shortTeamName)
    : 0;

  // Use the best similarity score and scale it to 0-50 points
  const bestSimilarity = Math.max(teamNameSimilarity, minNameSimilarity, shortNameSimilarity);
  score += Math.round((bestSimilarity / 100) * 50);

  // Location match (0-50 points)
  if (inputState && team.state.toLowerCase() === inputState.toLowerCase()) {
    score += 30;
  }
  if (inputCity && team.city.toLowerCase() === inputCity.toLowerCase()) {
    score += 20;
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

  // Auto-match if multiple results but one has clearly higher confidence
  const secondBest = sorted[1];
  const confidenceGap = best.confidence - secondBest.confidence;
  if (sorted.length > 1 && best.confidence >= CONFIDENCE_THRESHOLD && confidenceGap >= 10) {
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

