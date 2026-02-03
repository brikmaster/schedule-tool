// Auto-detect column mappings from CSV headers

import { AppState } from "@/types";

export function detectColumnMapping(
  headers: string[]
): AppState["columnMapping"] {
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  return {
    date: findBestMatch(
      headers,
      lowerHeaders,
      ["date", "game date", "day", "game day"]
    ),
    time: findBestMatch(
      headers,
      lowerHeaders,
      ["time", "game time", "start time", "start"]
    ),
    homeTeam: findBestMatch(
      headers,
      lowerHeaders,
      ["home team", "home", "home school", "host"]
    ),
    awayTeam: findBestMatch(
      headers,
      lowerHeaders,
      [
        "away team",
        "away",
        "away school",
        "opponent",
        "visiting team",
        "visitor",
      ]
    ),
    homeCity: findBestMatch(
      headers,
      lowerHeaders,
      ["home city", "city", "host city"]
    ),
    homeState: findBestMatch(
      headers,
      lowerHeaders,
      ["home state", "state", "host state"]
    ),
    awayCity: findBestMatch(
      headers,
      lowerHeaders,
      ["away city", "opponent city", "visitor city"]
    ),
    awayState: findBestMatch(
      headers,
      lowerHeaders,
      ["away state", "opponent state", "visitor state"]
    ),
  };
}

function findBestMatch(
  headers: string[],
  lowerHeaders: string[],
  candidates: string[]
): string | null {
  // Try exact match first
  for (const candidate of candidates) {
    const index = lowerHeaders.indexOf(candidate);
    if (index !== -1) {
      return headers[index]; // Return original casing
    }
  }

  // Try partial match (contains)
  for (const candidate of candidates) {
    const index = lowerHeaders.findIndex((h) => h.includes(candidate));
    if (index !== -1) {
      return headers[index];
    }
  }

  return null;
}
