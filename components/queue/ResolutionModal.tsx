"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import TeamCard from "@/components/ui/TeamCard";
import { Team } from "@/types";
import { calculateConfidence } from "@/lib/confidence";

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

  const filteredCandidates = searchQuery
    ? candidates.filter(
        (team) =>
          team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          team.minTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          team.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : candidates;

  const candidatesWithConfidence = filteredCandidates.map((team) => ({
    team,
    confidence: calculateConfidence(teamName, team, city, state),
  })).sort((a, b) => b.confidence - a.confidence);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolve Team: "${teamName}"`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Find a team"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ss-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ss-text-light)] hover:text-[var(--ss-text)]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search info */}
        <div className="text-sm text-[var(--ss-text-light)]">
          <span className="ss-link">Search Filters</span>
          {" | "}
          {state || "All States"} - All Organizations
        </div>

        {/* Candidates count */}
        <div className="text-sm font-medium text-[var(--ss-text)]">
          {candidatesWithConfidence.length} match
          {candidatesWithConfidence.length !== 1 ? "es" : ""} found:
        </div>

        {/* Team list */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {candidatesWithConfidence.length > 0 ? (
            candidatesWithConfidence.map(({ team, confidence }) => (
              <TeamCard
                key={team.teamId}
                team={team}
                onSelect={() => {
                  onSelect(team);
                  onClose();
                }}
                showConfidence
                confidence={confidence}
              />
            ))
          ) : (
            <div className="text-center py-8 text-[var(--ss-text-light)]">
              No teams found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-[var(--ss-border)]">
          <button
            onClick={() => {
              onSkip();
              onClose();
            }}
            className="ss-link"
          >
            Skip this team
          </button>
          <button onClick={onClose} className="ss-link">
            Team not listed
          </button>
        </div>
      </div>
    </Modal>
  );
}
