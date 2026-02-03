import React from "react";
import { Team } from "@/types";
import Button from "./Button";

interface TeamCardProps {
  team: Team;
  onSelect: () => void;
  showConfidence?: boolean;
  confidence?: number;
}

export default function TeamCard({
  team,
  onSelect,
  showConfidence = false,
  confidence,
}: TeamCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-[var(--ss-border)] rounded hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={`${team.teamName} logo`}
            className="w-12 h-12 object-contain"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-[var(--ss-text-light)] font-semibold">
            {team.minTeamName.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium text-[var(--ss-text)]">
            {team.teamName}
            {team.mascot1 && (
              <span className="text-[var(--ss-text-light)] ml-1">
                {team.mascot1}
              </span>
            )}
          </div>
          <div className="text-sm text-[var(--ss-text-light)]">
            {team.city}, {team.state}
          </div>
          {showConfidence && confidence !== undefined && (
            <div className="text-xs text-[var(--ss-text-light)] mt-1">
              Confidence: {confidence}%
            </div>
          )}
        </div>
      </div>
      <Button variant="primary" onClick={onSelect}>
        Select
      </Button>
    </div>
  );
}
