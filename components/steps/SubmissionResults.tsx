"use client";

import React, { useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import { useGameSubmission } from "@/hooks/useGameSubmission";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";

export default function SubmissionResults() {
  const { state, dispatch } = useAppState();
  const { submitGames, submitting, currentGame, totalGames } = useGameSubmission();

  // Auto-submit on mount if not already submitted
  useEffect(() => {
    if (state.submission.state === "idle") {
      submitGames();
    }
  }, []);

  const handleDownloadResults = () => {
    const csv = [
      ["Game", "Status", "Game ID", "URL", "Error"],
      ...state.submission.results.map((result) => {
        const game = state.games.find((g) => g.id === result.gameRowId);
        return [
          game
            ? `${game.awayTeam.originalText} @ ${game.homeTeam.originalText}`
            : "Unknown",
          result.status,
          result.gameId?.toString() || "",
          result.gameUrl || "",
          result.error || "",
        ];
      }),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-import-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
  };

  const results = state.submission.results;
  const created = results.filter((r) => r.status === "created").length;
  const scored = results.filter((r) => r.status === "scored").length;
  const duplicates = results.filter((r) => r.status === "duplicate").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return (
    <Card className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-light text-[var(--ss-text-light)] text-center mb-8">
        {submitting ? "Submitting Games..." : "Submission Complete"}
      </h1>

      {submitting && (
        <div className="mb-8">
          <ProgressBar
            current={currentGame}
            total={totalGames}
            label="Creating games on ScoreStream"
          />
          <p className="text-sm text-[var(--ss-text-light)] text-center mt-4">
            Please wait while we create your games. This may take a few moments.
          </p>
        </div>
      )}

      {!submitting && state.submission.state === "complete" && (
        <div>
          {/* Summary */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 border border-[var(--ss-success)] rounded text-center">
              <div className="text-3xl font-bold text-[var(--ss-success)]">
                {created}
              </div>
              <div className="text-sm text-[var(--ss-text-light)] mt-1">
                Created
              </div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-300 rounded text-center">
              <div className="text-3xl font-bold text-purple-600">
                {scored}
              </div>
              <div className="text-sm text-[var(--ss-text-light)] mt-1">
                Score Updated
              </div>
            </div>
            <div className="p-4 bg-orange-50 border border-[var(--ss-warning)] rounded text-center">
              <div className="text-3xl font-bold text-[var(--ss-warning)]">
                {duplicates}
              </div>
              <div className="text-sm text-[var(--ss-text-light)] mt-1">
                Duplicates
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-[var(--ss-error)] rounded text-center">
              <div className="text-3xl font-bold text-[var(--ss-error)]">
                {failed}
              </div>
              <div className="text-sm text-[var(--ss-text-light)] mt-1">
                Failed
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--ss-text)] uppercase mb-3">
              Detailed Results
            </h3>
            <div className="overflow-x-auto border border-[var(--ss-border)] rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                      Game
                    </th>
                    <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const game = state.games.find(
                      (g) => g.id === result.gameRowId
                    );
                    return (
                      <tr key={result.gameRowId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                          {game && (
                            <div>
                              <div className="font-medium text-[var(--ss-text)]">
                                {game.awayTeam.selectedTeam?.minTeamName} @{" "}
                                {game.homeTeam.selectedTeam?.minTeamName}
                              </div>
                              <div className="text-xs text-[var(--ss-text-light)]">
                                {game.date} at {game.time}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                          <StatusBadge status={result.status} />
                          {result.status === "failed" && result.error && (
                            <div className="text-xs text-[var(--ss-error)] mt-1">
                              {result.error}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--ss-border)]">
                          {result.gameUrl && (
                            <a
                              href={result.gameUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ss-link"
                            >
                              View Game →
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button onClick={handleDownloadResults}>
              Download Results CSV
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              Upload Another File
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
