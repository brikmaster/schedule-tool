"use client";

import React, { useEffect, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { useTeamResolution } from "@/hooks/useTeamResolution";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamCell from "@/components/queue/TeamCell";
import ResolutionModal from "@/components/queue/ResolutionModal";
import { GameRow, Team } from "@/types";

export default function GameQueue() {
  const { state, dispatch } = useAppState();
  const { resolveAllTeams, loading, progress } = useTeamResolution();
  const [resolutionModal, setResolutionModal] = useState<{
    isOpen: boolean;
    gameId: string;
    team: "home" | "away";
  } | null>(null);

  // Auto-resolve teams on mount
  useEffect(() => {
    if (state.games.length > 0 && state.games[0].homeTeam.status === "pending") {
      resolveAllTeams();
    }
  }, []);

  const handleSelectTeam = (gameId: string, team: "home" | "away", selectedTeam: Team) => {
    dispatch({
      type: "UPDATE_TEAM_RESOLUTION",
      gameId,
      team,
      resolution: {
        status: "matched",
        selectedTeam,
      },
    });
  };

  const handleSkipTeam = (gameId: string, team: "home" | "away") => {
    dispatch({
      type: "TOGGLE_GAME_SELECTION",
      id: gameId,
    });
  };

  const handleToggleSelection = (gameId: string) => {
    dispatch({ type: "TOGGLE_GAME_SELECTION", id: gameId });
  };

  const handleSelectAll = (selected: boolean) => {
    dispatch({ type: "SELECT_ALL_GAMES", selected });
  };

  const handleBack = () => {
    dispatch({ type: "SET_STEP", step: 3 });
  };

  const handleNext = () => {
    dispatch({ type: "SET_STEP", step: 5 });
  };

  const readyGames = state.games.filter((g) => g.status === "ready");
  const selectedGames = state.games.filter((g) => g.selected && g.status === "ready");
  const canProceed = selectedGames.length > 0;

  const currentModal = resolutionModal
    ? state.games.find((g) => g.id === resolutionModal.gameId)
    : null;

  const modalTeam = currentModal && resolutionModal
    ? resolutionModal.team === "home"
      ? currentModal.homeTeam
      : currentModal.awayTeam
    : null;

  const modalCity = currentModal && resolutionModal
    ? (resolutionModal.team === "home" ? currentModal.homeCity : currentModal.awayCity) ||
      state.rawData[currentModal.rowIndex]?.[
        resolutionModal.team === "home"
          ? state.columnMapping.homeCity || ""
          : state.columnMapping.awayCity || ""
      ]
    : undefined;

  const modalState = currentModal && resolutionModal
    ? (resolutionModal.team === "home" ? currentModal.homeState : currentModal.awayState) ||
      state.rawData[currentModal.rowIndex]?.[
        resolutionModal.team === "home"
          ? state.columnMapping.homeState || ""
          : state.columnMapping.awayState || ""
      ]
    : undefined;

  return (
    <Card className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-light text-[var(--ss-text-light)] text-center mb-8">
        Review Game Queue
      </h1>

      {loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-[var(--ss-primary)] rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--ss-primary)]">
                Resolving teams...
              </p>
              <p className="text-sm text-[var(--ss-text-light)] mt-1">
                Searching ScoreStream for team matches ({progress}% complete)
              </p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[var(--ss-primary)] h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!loading && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="flex items-center justify-between text-sm">
            <div className="space-x-4">
              <span>
                <span className="font-medium">{readyGames.length}</span> ready
              </span>
              <span>
                <span className="font-medium">
                  {state.games.filter((g) => g.status === "ambiguous").length}
                </span>{" "}
                ambiguous
              </span>
              <span>
                <span className="font-medium">
                  {state.games.filter((g) => g.status === "error").length}
                </span>{" "}
                errors
              </span>
            </div>
            <div>
              Selected:{" "}
              <span className="font-medium">{selectedGames.length}</span> of{" "}
              {state.games.length}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-[var(--ss-border)] rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left border-b border-[var(--ss-border)]">
                <input
                  type="checkbox"
                  checked={
                    readyGames.length > 0 &&
                    readyGames.every((g) => g.selected)
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={readyGames.length === 0}
                  className="cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                Date
              </th>
              <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                Time
              </th>
              <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                Away Team
              </th>
              <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                Home Team
              </th>
              <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {state.games.map((game) => (
              <tr key={game.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                  <input
                    type="checkbox"
                    checked={game.selected}
                    onChange={() => handleToggleSelection(game.id)}
                    disabled={game.status !== "ready"}
                    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-3 text-[var(--ss-text)] border-b border-[var(--ss-border)]">
                  {game.date || "—"}
                </td>
                <td className="px-4 py-3 text-[var(--ss-text)] border-b border-[var(--ss-border)]">
                  {game.time || "—"}
                </td>
                <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                  <TeamCell
                    team={game.awayTeam}
                    onClick={() =>
                      (game.awayTeam.status === "ambiguous" || game.awayTeam.status === "not_found") &&
                      setResolutionModal({
                        isOpen: true,
                        gameId: game.id,
                        team: "away",
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                  <TeamCell
                    team={game.homeTeam}
                    onClick={() =>
                      (game.homeTeam.status === "ambiguous" || game.homeTeam.status === "not_found") &&
                      setResolutionModal({
                        isOpen: true,
                        gameId: game.id,
                        team: "home",
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                  <StatusBadge status={game.status} />
                </td>
                <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                  {(game.status === "ambiguous" || game.status === "error") && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (game.homeTeam.status === "ambiguous" || game.homeTeam.status === "not_found") {
                          setResolutionModal({
                            isOpen: true,
                            gameId: game.id,
                            team: "home",
                          });
                        } else if (game.awayTeam.status === "ambiguous" || game.awayTeam.status === "not_found") {
                          setResolutionModal({
                            isOpen: true,
                            gameId: game.id,
                            team: "away",
                          });
                        }
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.games.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="secondary" onClick={handleBack}>
            Previous
          </Button>
          <Button onClick={handleNext} disabled={!canProceed}>
            Schedule {selectedGames.length} Game{selectedGames.length !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Resolution Modal */}
      {resolutionModal && modalTeam && (
        <ResolutionModal
          isOpen={resolutionModal.isOpen}
          onClose={() => setResolutionModal(null)}
          teamName={modalTeam.originalText}
          candidates={modalTeam.searchResults || []}
          onSelect={(team) =>
            handleSelectTeam(resolutionModal.gameId, resolutionModal.team, team)
          }
          onSkip={() =>
            handleSkipTeam(resolutionModal.gameId, resolutionModal.team)
          }
          city={modalCity}
          state={modalState}
        />
      )}
    </Card>
  );
}
