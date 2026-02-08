import { useState } from "react";
import { useAppState } from "./useAppState";
import { addGame, addScore, getGame } from "@/lib/api";
import { SubmissionResult, SubmissionStatus } from "@/types";
import { FINAL_SEGMENT_ID } from "@/lib/constants";
import { selectFinalSegment } from "@/lib/utils/segmentSelector";

export function useGameSubmission() {
  const { state, dispatch } = useAppState();
  const [submitting, setSubmitting] = useState(false);
  const [currentGame, setCurrentGame] = useState(0);

  const combineDateTime = (date: string, time: string): string => {
    // Validate inputs
    if (!date || !time || date.trim() === "" || time.trim() === "") {
      throw new Error("Missing date or time");
    }

    let month: string, day: string, year: string;

    // Month name to number mapping
    const monthNames: Record<string, string> = {
      'jan': '1', 'january': '1',
      'feb': '2', 'february': '2',
      'mar': '3', 'march': '3',
      'apr': '4', 'april': '4',
      'may': '5',
      'jun': '6', 'june': '6',
      'jul': '7', 'july': '7',
      'aug': '8', 'august': '8',
      'sep': '9', 'sept': '9', 'september': '9',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12',
    };

    // Try parsing date in MM/DD/YYYY or M/D/YYYY format
    if (date.includes("/")) {
      const dateParts = date.split("/");
      if (dateParts.length !== 3) {
        throw new Error(`Invalid date format: "${date}". Expected MM/DD/YYYY or M/D/YYYY`);
      }
      [month, day, year] = dateParts;

      // Validate date parts exist
      if (!month || !day || !year) {
        throw new Error(`Invalid date components in: "${date}"`);
      }

      // Handle 2-digit years (convert to 4-digit)
      if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        year = yearNum >= 50 ? `19${year}` : `20${year}`;
      }
    } else if (date.includes("-") && !date.match(/[a-zA-Z]/)) {
      // Try ISO format YYYY-MM-DD (only if no letters)
      const dateParts = date.split("-");
      if (dateParts.length !== 3) {
        throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD`);
      }
      [year, month, day] = dateParts;
    } else {
      // Try parsing text format like "Wed, Feb 11" or "February 11, 2025"
      // Remove day of week if present (e.g., "Wed, ")
      let cleanDate = date.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*/i, '').trim();

      // Match patterns like "Feb 11" or "February 11, 2025" or "Feb 11, 2025"
      const textDateMatch = cleanDate.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/);

      if (textDateMatch) {
        const monthName = textDateMatch[1].toLowerCase();
        day = textDateMatch[2];
        year = textDateMatch[3] || new Date().getFullYear().toString(); // Default to current year if not specified

        month = monthNames[monthName];
        if (!month) {
          throw new Error(`Invalid month name: "${textDateMatch[1]}"`);
        }
      } else {
        throw new Error(`Invalid date format: "${date}". Expected MM/DD/YYYY, YYYY-MM-DD, or "Month Day" format`);
      }
    }

    // Parse time
    let timeStr = time.trim();
    let period = "";

    // Extract AM/PM if present
    const ampmMatch = timeStr.match(/\s*(AM|PM|am|pm|A\.M\.|P\.M\.)\s*$/i);
    if (ampmMatch) {
      period = ampmMatch[1].toUpperCase().replace(/\./g, "");
      timeStr = timeStr.substring(0, ampmMatch.index).trim();
    }

    // Split hours and minutes
    const hourMinuteParts = timeStr.split(":");
    if (hourMinuteParts.length < 2) {
      throw new Error(`Invalid time format: "${time}". Expected HH:MM or HH:MM AM/PM`);
    }

    let hours = hourMinuteParts[0];
    let minutes = hourMinuteParts[1];

    // Remove seconds if present
    if (hourMinuteParts.length === 3) {
      minutes = hourMinuteParts[1]; // Keep just minutes, ignore seconds
    }

    // Validate time parts
    if (!hours || !minutes) {
      throw new Error(`Invalid time components in: "${time}"`);
    }

    // Convert to 24-hour format
    let hour = parseInt(hours, 10);
    if (isNaN(hour)) {
      throw new Error(`Invalid hour value: "${hours}"`);
    }

    // Apply AM/PM conversion
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }

    // Validate parsed values
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const yearNum = parseInt(year, 10);
    const minuteNum = parseInt(minutes, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error(`Invalid month: "${month}"`);
    }
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      throw new Error(`Invalid day: "${day}"`);
    }
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      throw new Error(`Invalid year: "${year}"`);
    }
    if (hour < 0 || hour > 23) {
      throw new Error(`Invalid hour: "${hour}"`);
    }
    if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
      throw new Error(`Invalid minute: "${minutes}"`);
    }

    // Create ISO datetime string
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const isoTime = `${hour.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;

    return `${isoDate}T${isoTime}`;
  };

  const submitGames = async () => {
    dispatch({ type: "SET_SUBMISSION_STATE", state: "submitting" });
    setSubmitting(true);
    setCurrentGame(0);

    const selectedGames = state.games.filter(
      (g) => g.selected && g.status === "ready"
    );
    const results: SubmissionResult[] = [];

    for (let i = 0; i < selectedGames.length; i++) {
      const game = selectedGames[i];
      setCurrentGame(i + 1);

      try {
        if (!game.homeTeam.selectedTeam || !game.awayTeam.selectedTeam) {
          throw new Error("Missing team selection");
        }

        if (!game.date || !game.time) {
          throw new Error("Missing date or time");
        }

        const response = await addGame({
          homeTeamId: game.homeTeam.selectedTeam.teamId,
          awayTeamId: game.awayTeam.selectedTeam.teamId,
          homeSquadId: state.defaults.squadId!,
          awaySquadId: state.defaults.squadId!, // Same squad for both teams
          sportName: state.defaults.sport!,
          gameSegmentType: state.defaults.segmentType!,
          localStartDateTime: combineDateTime(game.date, game.time),
          localGameTimezone: state.defaults.timezone,
          duplicateCheckWindow: "large",
        });

        // Extract game details from the response
        const gameData = response.result?.collections?.gameCollection?.list?.[0];
        const gameId = response.result?.gameId || gameData?.gameId;
        const gameUrl = gameData?.url || `https://scorestream.com/game/${gameId}`;

        // Check if duplicate by looking for existing scores or specific flag
        const isDuplicate = (gameData?.totalPosts ?? 0) > 0 || (gameData?.totalQuickScores ?? 0) > 0;

        // If game has scores (already played), add final score
        const hasScores =
          game.homeScore !== null &&
          game.homeScore !== undefined &&
          game.awayScore !== null &&
          game.awayScore !== undefined;

        if (hasScores && !isDuplicate) {
          try {
            // First, fetch the game to get the correct segment IDs
            const gameDetails = await getGame({
              gameIds: [response.result.gameId],
            });

            // Check if response has the expected structure
            if (!gameDetails?.result?.collections?.gameCollection?.list?.[0]) {
              throw new Error(`Invalid API response structure`);
            }

            // Get the game data from the actual response structure
            const gameData = gameDetails.result.collections.gameCollection.list[0];
            const boxScores = gameData.boxScores || [];

            if (boxScores.length === 0) {
              throw new Error("No game segments found in boxScores");
            }

            const selection = selectFinalSegment(boxScores);

            const scoreResponse = await addScore({
              accessToken: process.env.NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN || "",
              gameId: response.result.gameId,
              homeTeamScore: game.homeScore!,
              awayTeamScore: game.awayScore!,
              gameSegmentId: selection.gameSegmentId,
            });
          } catch (scoreError) {
            console.error(`Failed to add score for game ${response.result.gameId}:`, scoreError);
            // Continue even if score fails - game is still created
          }
        }

        results.push({
          gameRowId: game.id,
          status: isDuplicate ? "duplicate" : "created",
          gameId: gameId,
          gameUrl: gameUrl,
        });
      } catch (error) {
        results.push({
          gameRowId: game.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Update progress
      dispatch({
        type: "SET_SUBMISSION_STATE",
        state: "submitting",
        results: [...results],
      });
    }

    dispatch({ type: "SET_SUBMISSION_STATE", state: "complete", results });
    setSubmitting(false);
  };

  return {
    submitGames,
    submitting,
    currentGame,
    totalGames: state.games.filter((g) => g.selected && g.status === "ready")
      .length,
  };
}
