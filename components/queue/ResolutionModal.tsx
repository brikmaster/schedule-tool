"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import TeamCard from "@/components/ui/TeamCard";
import { Team } from "@/types";
import { calculateConfidence } from "@/lib/confidence";
import { searchTeams } from "@/lib/api";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  candidates: Team[];
  onSelect: (team: Team) => void;
  onSkip: () => void;
  city?: string;
  state?: string;
}

export default function ResolutionModal({
  isOpen,
  onClose,
  teamName,
  candidates,
  onSelect,
  onSkip,
  city,
  state,
}: ResolutionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [liveResults, setLiveResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const doSearch = async (query: string) => {
    if (query.length < 3) return;

    setSearching(true);
    setSearchError(null);
    try {
      // Try with state filter first
      let response = await searchTeams({
        teamName: query,
        state: state || undefined,
        count: 10,
        recommendedFor: "addingGames",
        ignoreUserCreatedTeams: true,
      });
      let results = response.result?.collections?.teamCollection?.list || [];

      // If no results, try first word only
      if (results.length === 0) {
        const firstWord = query.split(/\s+/)[0];
        if (firstWord && firstWord.length >= 3 && firstWord !== query) {
          response = await searchTeams({
            teamName: firstWord,
            state: state || undefined,
            count: 10,
            recommendedFor: "addingGames",
            ignoreUserCreatedTeams: true,
          });
          results = response.result?.collections?.teamCollection?.list || [];
        }
      }

      // If still no results, try without state
      if (results.length === 0) {
        response = await searchTeams({
          teamName: query,
          count: 10,
          recommendedFor: "addingGames",
          ignoreUserCreatedTeams: true,
        });
        results = response.result?.collections?.teamCollection?.list || [];
      }

      setLiveResults(results);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSearchError(msg);
      setLiveResults([]);
    }
    setSearching(false);
  };

  // Determine what to display
  const isShowingLiveResults = liveResults.length > 0 || searching || searchError;
  const displayTeams = isShowingLiveResults
    ? liveResults
    : searchQuery
      ? candidates.filter(
          (team) =>
            team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.minTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.city.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : candidates;

  const teamsWithConfidence = displayTeams
    .map((team) => ({
      team,
      confidence: calculateConfidence(teamName, team, city, state),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const handleClose = () => {
    setSearchQuery("");
    setLiveResults([]);
    setSearchError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Resolve Team: "${teamName}"`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search for a team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim().length >= 3) {
                  doSearch(searchQuery.trim());
                }
              }}
              className="ss-input"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLiveResults([]);
                  setSearchError(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ss-text-light)] hover:text-[var(--ss-text)]"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={() => doSearch(searchQuery.trim())}
            disabled={searchQuery.trim().length < 3 || searching}
            className="px-4 py-2 bg-[var(--ss-primary)] text-white rounded disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        {searchError && (
          <div className="text-sm text-[var(--ss-error)] bg-red-50 p-2 rounded">
            Search error: {searchError}
          </div>
        )}

        <div className="text-sm text-[var(--ss-text-light)]">
          {state || "All States"} — Type a name and press Search or Enter
        </div>

        <div className="text-sm font-medium text-[var(--ss-text)]">
          {teamsWithConfidence.length} match
          {teamsWithConfidence.length !== 1 ? "es" : ""} found:
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {teamsWithConfidence.length > 0 ? (
            teamsWithConfidence.map(({ team, confidence }) => (
              <TeamCard
                key={team.teamId}
                team={team}
                onSelect={() => {
                  onSelect(team);
                  handleClose();
                }}
                showConfidence
                confidence={confidence}
              />
            ))
          ) : (
            <div className="text-center py-8 text-[var(--ss-text-light)]">
              {candidates.length === 0 && !isShowingLiveResults
                ? "Use the search box above to find this team"
                : "No teams found"}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t border-[var(--ss-border)]">
          <button
            onClick={() => {
              onSkip();
              handleClose();
            }}
            className="ss-link"
          >
            Skip this team
          </button>
          <button onClick={handleClose} className="ss-link">
            Team not listed
          </button>
        </div>
      </div>
    </Modal>
  );
}
