import React from "react";
import { TeamResolution } from "@/types";

interface TeamCellProps {
  team: TeamResolution;
  onClick?: () => void;
}

export default function TeamCell({ team, onClick }: TeamCellProps) {
  if (team.status === "matched" && team.selectedTeam) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--ss-success)] flex-shrink-0" />
        {team.selectedTeam.logoUrl && (
          <img
            src={team.selectedTeam.logoUrl}
            alt=""
            className="w-8 h-8 object-contain"
          />
        )}
        <div className="min-w-0">
          <div className="font-medium text-[var(--ss-text)] truncate">
            {team.selectedTeam.minTeamName} {team.selectedTeam.mascot1}
          </div>
          <div className="text-xs text-[var(--ss-text-light)]">
            {team.selectedTeam.city}, {team.selectedTeam.state}
          </div>
        </div>
      </div>
    );
  }

  if (team.status === "ambiguous") {
    return (
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 p-2 rounded transition-colors"
        onClick={onClick}
      >
        <div className="w-2 h-2 rounded-full bg-[var(--ss-warning)] flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-[var(--ss-text)] truncate">
            "{team.originalText}"
          </div>
          <div className="text-xs text-[var(--ss-warning)]">
            {team.searchResults?.length || 0} matches - click to resolve
          </div>
        </div>
      </div>
    );
  }

  if (team.status === "not_found") {
    return (
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-red-50 p-2 rounded transition-colors"
        onClick={onClick}
      >
        <div className="w-2 h-2 rounded-full bg-[var(--ss-error)] flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-[var(--ss-text)] truncate">
            "{team.originalText}"
          </div>
          <div className="text-xs text-[var(--ss-error)]">No matches - click to search</div>
        </div>
      </div>
    );
  }

  // Pending state
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
      <div className="text-[var(--ss-text-light)]">
        "{team.originalText}"
      </div>
    </div>
  );
}
