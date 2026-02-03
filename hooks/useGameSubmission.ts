import { useState } from "react";
import { useAppState } from "./useAppState";
import { addGame } from "@/lib/api";
import { SubmissionResult } from "@/types";

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
