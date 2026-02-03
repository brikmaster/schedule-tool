import { useState } from "react";
import { useAppState } from "./useAppState";
import { addGame, addScore, getGame } from "@/lib/api";
import { SubmissionResult } from "@/types";
import { FINAL_SEGMENT_ID } from "@/lib/constants";

export function useGameSubmission() {
  const { state, dispatch } = useAppState();
  const [submitting, setSubmitting] = useState(false);
  const [currentGame, setCurrentGame] = useState(0);

  const combineDateTime = (date: string, time: string): string => {
    // Parse date (assuming MM/DD/YYYY format)
    const [month, day, year] = date.split("/");

    // Parse time (assuming HH:MM AM/PM format)
    let [timeStr, period] = time.split(" ");
    let [hours, minutes] = timeStr.split(":");

    // Convert to 24-hour format
    let hour = parseInt(hours, 10);
    if (period?.toUpperCase() === "PM" && hour !== 12) {
      hour += 12;
    } else if (period?.toUpperCase() === "AM" && hour === 12) {
      hour = 0;
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
        console.log(`[Game Submission] Processing game ${i + 1}:`, {
          homeTeam: game.homeTeam.selectedTeam?.teamName,
          awayTeam: game.awayTeam.selectedTeam?.teamName,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          hasScores: game.homeScore !== null && game.homeScore !== undefined && game.awayScore !== null && game.awayScore !== undefined,
        });

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

        // If game has scores (already played), add final score
        const hasScores =
          game.homeScore !== null &&
          game.homeScore !== undefined &&
          game.awayScore !== null &&
          game.awayScore !== undefined;

        if (hasScores && !response.result.isDuplicate) {
          try {
            // First, fetch the game to get the correct segment IDs
            console.log(`[Score Submission] Fetching game segments for game ${response.result.gameId}`);
            const gameDetails = await getGame({
              gameIds: [response.result.gameId],
            });

            console.log(`[Score Submission] Full API response:`, gameDetails);

            // Check if response has the expected structure
            if (!gameDetails?.result?.collections?.gameCollection?.list?.[0]) {
              throw new Error(`Invalid API response structure: ${JSON.stringify(gameDetails)}`);
            }

            // Get the game data from the actual response structure
            const gameData = gameDetails.result.collections.gameCollection.list[0];
            const boxScores = gameData.boxScores || [];

            console.log(`[Score Submission] Box scores:`, boxScores);

            if (boxScores.length === 0) {
              throw new Error("No game segments found in boxScores");
            }

            // The last segment in boxScores is the final/summary segment
            const finalSegment = boxScores[boxScores.length - 1];

            console.log(`[Score Submission] Using final segment ID ${finalSegment.gameSegmentId}`);

            const scoreResponse = await addScore({
              accessToken: process.env.NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN || "",
              gameId: response.result.gameId,
              homeTeamScore: game.homeScore!,
              awayTeamScore: game.awayScore!,
              gameSegmentId: finalSegment.gameSegmentId,
            });

            console.log(`[Score Submission] Success for game ${response.result.gameId}:`, scoreResponse);
          } catch (scoreError) {
            console.error(`[Score Submission] Failed for game ${response.result.gameId}:`, scoreError);
            // Continue even if score fails - game is still created
          }
        }

        results.push({
          gameRowId: game.id,
          status: response.result.isDuplicate ? "duplicate" : "created",
          gameId: response.result.gameId,
          gameUrl: response.result.url,
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
