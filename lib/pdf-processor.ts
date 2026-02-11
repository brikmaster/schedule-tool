import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";

interface ExtractedGame {
  date: string | null;
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  homeCity: string | null;
  homeState: string | null;
  awayCity: string | null;
  awayState: string | null;
  homeScore: number | null;
  awayScore: number | null;
  isCompleted: boolean;
}

interface VisionResult {
  success: boolean;
  games: ExtractedGame[];
  mainTeam: string;
  format: string;
  debug?: string;
}

const EXTRACTION_PROMPT = `Extract all games/matches from this PDF schedule. Return valid JSON only, no other text.

Response format:
{
  "mainTeam": "Primary team name if this is a single-team schedule, otherwise empty string",
  "format": "Brief description of the PDF format",
  "games": [
    {
      "date": "M/D/YYYY",
      "time": "h:mm AM/PM or null if not listed",
      "homeTeam": "Home team name",
      "awayTeam": "Away team name",
      "homeCity": "Home team city or null",
      "homeState": "Home team 2-letter state code or null",
      "awayCity": "Away team city or null",
      "awayState": "Away team 2-letter state code or null",
      "homeScore": null,
      "awayScore": null,
      "isCompleted": false
    }
  ]
}

Rules:
- Date format MUST be M/D/YYYY (no leading zeros, 4-digit year). Convert from any format.
- If the schedule shows "@ Team" or "at Team", that team is the home team and the main team is the away team.
- If the schedule shows "vs Team" or "vs. Team", the main team is the home team.
- Include completed games with scores (isCompleted: true, homeScore/awayScore filled).
- For games with TBA/TBD time, set time to null.
- Strip mascot names from team names (e.g., "Lincoln Lions" → "Lincoln").
- Keep "High School", "HS", etc. in team names.
- Do NOT append city names to team names for disambiguation. Use the city/state fields instead. Example: "Riverview" in Sarasota should be homeTeam: "Riverview", homeCity: "Sarasota" — NOT homeTeam: "Riverview Sarasota".
- If city/state are available, include them. Otherwise null.
- Only include actual games, not bye weeks, headers, or notes.
- If a game has a score, mark isCompleted: true.
- SKIP games with placeholder teams like "W-1", "W-2", "L-3", "TBD", "Winner of...", "Loser of...". Only include games where both teams are real, named schools.
- For bracket formats with "@ Venue" notation, the venue/host site is the home team's location.
- For Hawaii schedules: all schools are in state "HI".
- For completed games without a listed time, set time to "7:00 PM".
- Convert shorthand times: "7p" → "7:00 PM", "12p" → "12:00 PM", "6p" → "6:00 PM", "5p" → "5:00 PM", "2p" → "2:00 PM", "7a" → "7:00 AM", etc. Always output times in "h:mm AM/PM" format.
- IMPORTANT: Bracket PDFs often show date+time combined like "2/14 @ 7p" or "2/14 @ 12p". The part before @ is the date, the part after @ is the TIME. Extract both. "2/14 @ 7p" → date "2/14/2026", time "7:00 PM". Do NOT set time to null when it's present in this format.
- Read each game's date and time VERY carefully from the bracket box directly above or beside that matchup. Each bracket box has its own date/time — do not copy from neighboring boxes. Common bracket times include 12p, 2p, 5p, 6p, 7p. Double-check each one.`;

function normalizeDate(dateStr: string): string {
  // Handle YYYY-MM-DD → M/D/YYYY
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  }
  // Handle MM/DD/YYYY with leading zeros → M/D/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    if (year.length === 2) year = `20${year}`;
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  }
  return dateStr;
}

function validateGame(game: any): game is ExtractedGame {
  return (
    game &&
    typeof game.homeTeam === "string" &&
    game.homeTeam.length > 0 &&
    typeof game.awayTeam === "string" &&
    game.awayTeam.length > 0
  );
}

export async function extractWithVision(
  pdfBuffer: ArrayBuffer,
  fileName: string
): Promise<VisionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const base64 = Buffer.from(pdfBuffer).toString("base64");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON — handle markdown code fences
  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  const parsed = JSON.parse(jsonStr);
  console.log(`[vision] Raw response: ${(parsed.games || []).length} games, mainTeam: "${parsed.mainTeam}", format: "${parsed.format}"`);
  console.log(`[vision] First 3 raw games:`, JSON.stringify((parsed.games || []).slice(0, 3)));

  // Validate and normalize games
  const preFilterCount = (parsed.games || []).length;
  const games: ExtractedGame[] = (parsed.games || [])
    .filter(validateGame)
    .map((g: any) => ({
      date: g.date ? normalizeDate(g.date) : null,
      time: g.time || null,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeCity: g.homeCity || null,
      homeState: g.homeState || null,
      awayCity: g.awayCity || null,
      awayState: g.awayState || null,
      homeScore: typeof g.homeScore === "number" ? g.homeScore : null,
      awayScore: typeof g.awayScore === "number" ? g.awayScore : null,
      isCompleted: !!g.isCompleted,
    }));

  const debug = `rawText=${textBlock.text.length}chars, parsed=${preFilterCount}games, valid=${games.length}games, stopReason=${response.stop_reason}`;
  console.log(`[vision] ${debug}`);

  return {
    success: true,
    games,
    mainTeam: parsed.mainTeam || "",
    format: parsed.format || "unknown",
    debug,
  };
}
