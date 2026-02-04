import { useState } from "react";
import { useAppState } from "./useAppState";
import { addGame, addScore, getGame } from "@/lib/api";
import { SubmissionResult } from "@/types";
import { FINAL_SEGMENT_ID } from "@/lib/constants";
import { selectFinalSegment } from "@/lib/utils/segmentSelector";

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

        console.log('[Game Submission] games.add response:', response);

        // Extract game details from the response
        const gameData = response.result?.collections?.gameCollection?.list?.[0];
        const gameId = response.result?.gameId || gameData?.gameId;
        const gameUrl = gameData?.url || `https://scorestream.com/game/${gameId}`;

        // Check if duplicate by looking for existing scores or specific flag
        const isDuplicate = gameData?.totalPosts > 0 || gameData?.totalQuickScores > 0;

        // If game has scores (already played), add final score
        const hasScores =
          game.homeScore !== null &&
          game.homeScore !== undefined &&
          game.awayScore !== null &&
          game.awayScore !== undefined;

        if (hasScores && !isDuplicate) {
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

            console.log(`[Score Submission] Full game data:`, JSON.stringify(gameData, null, 2));
            console.log(`[Score Submission] Box scores:`, boxScores);
            console.log(`[Score Submission] Number of segments:`, boxScores.length);

            if (boxScores.length === 0) {
              throw new Error("No game segments found in boxScores");
            }

            // Log all segment details for debugging
            boxScores.forEach((seg, idx) => {
              console.log(`[Score Submission] Segment ${idx}:`, {
                id: seg.gameSegmentId,
                name: seg.segmentName,
                homeScore: seg.homeTeamScore,
                awayScore: seg.awayTeamScore
              });
            });

            // For basketball with quarters, the segments are typically:
            // 0: 1st Quarter (10010)
            // 1: 2nd Quarter (10020)
            // 2: 3rd Quarter (10030)
            // 3: 4th Quarter (10040)
            // 4: Total (19888)
            // Final (19999) - Often NOT included in boxScores array
            //
            // User confirmed "Final comes after Total", so we use segment ID 19999
            // Don't use boxScores.length-1 because that's Total, not Final!

            const selection = selectFinalSegment(boxScores);

            console.log(`[Score Submission] Selected segment using strategy: ${selection.source}`);
            console.log(`[Score Submission] Selected segment ID: ${selection.gameSegmentId}`);
            if (selection.segmentName) {
              console.log(`[Score Submission] Selected segment name: ${selection.segmentName}`);
            }

            const scoreResponse = await addScore({
              accessToken: process.env.NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN || "",
              gameId: response.result.gameId,
              homeTeamScore: game.homeScore!,
              awayTeamScore: game.awayScore!,
              gameSegmentId: selection.gameSegmentId,
            });

            console.log(`[Score Submission] Success for game ${response.result.gameId}:`, scoreResponse);
          } catch (scoreError) {
            console.error(`[Score Submission] Failed for game ${response.result.gameId}:`, scoreError);
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
