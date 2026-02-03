import { useState } from "react";
import { useAppState } from "./useAppState";
import { searchTeams } from "@/lib/api";
import { autoMatchTeam } from "@/lib/confidence";

export function useTeamResolution() {
  const { state, dispatch } = useAppState();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const resolveAllTeams = async () => {
    setLoading(true);
    setProgress(0);

    const totalSearches = state.games.length * 2; // Home and away for each game
    let completed = 0;

    for (const game of state.games) {
      // Resolve home team
      try {
        const homeCity = state.rawData[game.rowIndex]?.[
          state.columnMapping.homeCity || ""
        ];
        const homeState = state.rawData[game.rowIndex]?.[
          state.columnMapping.homeState || ""
        ] || state.defaults.state || "";

        const homeResponse = await searchTeams({
          teamName: game.homeTeam.originalText,
          city: homeCity,
          state: homeState,
          orgId: state.defaults.orgId || undefined,
          recommendedFor: "addingGames",
          ignoreUserCreatedTeams: true,
          count: 10,
        });

        const allHomeTeams = homeResponse.result?.collections?.teamCollection?.list || [];

        console.log(`[Team Resolution] Home team "${game.homeTeam.originalText}":`, {
          totalResults: allHomeTeams.length,
          state: homeState,
          orgId: state.defaults.orgId,
          firstTeam: allHomeTeams[0] ? {
            name: allHomeTeams[0].teamName,
            orgId: allHomeTeams[0].orgId || allHomeTeams[0].organizationId || 'N/A'
          } : 'None'
        });

        // Filter results to only include teams from the selected organization
        const filteredHomeTeams = allHomeTeams.filter((team: any) => {
          // Check multiple possible orgId field names
          const teamOrgId = team.orgId || team.organizationId || team.orgID || team.org_id;

          if (state.defaults.orgId && teamOrgId) {
            return teamOrgId === state.defaults.orgId;
          }

          // If no orgId found on team, exclude it to be safe
          return false;
        });

        console.log(`[Team Resolution] After org filter:`, {
          before: allHomeTeams.length,
          after: filteredHomeTeams.length,
          expectedOrgId: state.defaults.orgId
        });

        const homeResolution = autoMatchTeam(
          filteredHomeTeams,
          game.homeTeam.originalText,
          homeCity,
          homeState
        );

        dispatch({
          type: "UPDATE_TEAM_RESOLUTION",
          gameId: game.id,
          team: "home",
          resolution: homeResolution,
        });

        completed++;
        setProgress(Math.round((completed / totalSearches) * 100));
      } catch (error) {
        console.error(`[Team Resolution] Error resolving home team "${game.homeTeam.originalText}":`, error);
        dispatch({
          type: "UPDATE_TEAM_RESOLUTION",
          gameId: game.id,
          team: "home",
          resolution: {
            status: "not_found",
            searchResults: [],
          },
        });
        completed++;
        setProgress(Math.round((completed / totalSearches) * 100));
      }

      // Resolve away team
      try {
        const awayCity = state.rawData[game.rowIndex]?.[
          state.columnMapping.awayCity || ""
        ];
        const awayState = state.rawData[game.rowIndex]?.[
          state.columnMapping.awayState || ""
        ] || state.defaults.state || "";

        const awayResponse = await searchTeams({
          teamName: game.awayTeam.originalText,
          city: awayCity,
          state: awayState,
          orgId: state.defaults.orgId || undefined,
          recommendedFor: "addingGames",
          ignoreUserCreatedTeams: true,
          count: 10,
        });

        const allAwayTeams = awayResponse.result?.collections?.teamCollection?.list || [];

        // Filter results to only include teams from the selected organization
        const filteredAwayTeams = allAwayTeams.filter((team: any) => {
          // Check multiple possible orgId field names
          const teamOrgId = team.orgId || team.organizationId || team.orgID || team.org_id;

          if (state.defaults.orgId && teamOrgId) {
            return teamOrgId === state.defaults.orgId;
          }

          // If no orgId found on team, exclude it to be safe
          return false;
        });

        const awayResolution = autoMatchTeam(
          filteredAwayTeams,
          game.awayTeam.originalText,
          awayCity,
          awayState
        );

        dispatch({
          type: "UPDATE_TEAM_RESOLUTION",
          gameId: game.id,
          team: "away",
          resolution: awayResolution,
        });

        completed++;
        setProgress(Math.round((completed / totalSearches) * 100));
      } catch (error) {
        console.error("Error resolving away team:", error);
        dispatch({
          type: "UPDATE_TEAM_RESOLUTION",
          gameId: game.id,
          team: "away",
          resolution: {
            status: "not_found",
            searchResults: [],
          },
        });
        completed++;
        setProgress(Math.round((completed / totalSearches) * 100));
      }
    }

    setLoading(false);
    setProgress(100);
  };

  return { resolveAllTeams, loading, progress };
}
