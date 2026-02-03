// Team Name Parser - Extract location info from team names
// Handles formats like: "Sierra(Manteca, CA)" or "Sierra (Manteca, CA)"

export interface ParsedTeamName {
  teamName: string;
  city?: string;
  state?: string;
}

/**
 * Parses team names that include location info in parentheses
 * Examples:
 *   "Sierra(Manteca, CA)" -> { teamName: "Sierra", city: "Manteca", state: "CA" }
 *   "Sierra (Manteca, CA)" -> { teamName: "Sierra", city: "Manteca", state: "CA" }
 *   "Sierra" -> { teamName: "Sierra" }
 */
export function parseTeamName(input: string): ParsedTeamName {
  // Regex to match: TeamName(City, State) or TeamName (City, State)
  // Captures: team name, city, state
  const regex = /^(.+?)\s*\(([^,]+),\s*([^)]+)\)\s*$/;
  const match = input.match(regex);

  if (match) {
    return {
      teamName: match[1].trim(),
      city: match[2].trim(),
      state: match[3].trim(),
    };
  }

  // No location info found, return original name
  return {
    teamName: input.trim(),
  };
}
