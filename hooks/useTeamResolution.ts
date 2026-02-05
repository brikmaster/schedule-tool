import { useState } from "react";
import { useAppState } from "./useAppState";
import { searchTeams } from "@/lib/api";
import { autoMatchTeam } from "@/lib/confidence";
import { parseTeamName } from "@/lib/utils/teamNameParser";
import { normalizeTeamName, extractCoreName } from "@/lib/utils/teamNameNormalizer";

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
        // Parse team name for embedded location info (e.g., "Sierra(Manteca, CA)")
        const parsedHome = parseTeamName(game.homeTeam.originalText);

        // Normalize team name (remove quotes, convert HS to High School, etc.)
        const normalizedHomeName = normalizeTeamName(parsedHome.teamName);

        // Extract core name for broader API search (e.g., "Wildwood HS" -> "Wildwood")
        // This helps find teams like "Wildwood Middle High School" when searching "Wildwood HS"
        const coreHomeName = extractCoreName(parsedHome.teamName);
        const searchHomeName = coreHomeName.length >= 3 ? coreHomeName : normalizedHomeName;

        // Use parsed location if available, otherwise fall back to game data, CSV columns, or defaults
        const homeCity = parsedHome.city ||
          game.homeCity ||
          state.rawData[game.rowIndex]?.[state.columnMapping.homeCity || ""];
        const homeState = parsedHome.state ||
          game.homeState ||
          state.rawData[game.rowIndex]?.[state.columnMapping.homeState || ""] ||
          state.defaults.state || "";

        const homeResponse = await searchTeams({
          teamName: searchHomeName,
          city: homeCity,
          state: homeState,
          orgId: state.defaults.orgId || undefined,
          recommendedFor: "addingGames",
          ignoreUserCreatedTeams: true,
          count: 10,
        });

        const allHomeTeams = homeResponse.result?.collections?.teamCollection?.list || [];

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

        const homeResolution = autoMatchTeam(
          filteredHomeTeams,
          normalizedHomeName,
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
        // Parse team name for embedded location info (e.g., "Sierra(Manteca, CA)")
        const parsedAway = parseTeamName(game.awayTeam.originalText);

        // Normalize team name (remove quotes, convert HS to High School, etc.)
        const normalizedAwayName = normalizeTeamName(parsedAway.teamName);

        // Extract core name for broader API search (e.g., "Wildwood HS" -> "Wildwood")
        // This helps find teams like "Wildwood Middle High School" when searching "Wildwood HS"
        const coreAwayName = extractCoreName(parsedAway.teamName);
        const searchAwayName = coreAwayName.length >= 3 ? coreAwayName : normalizedAwayName;

        // Use parsed location if available, otherwise fall back to game data, CSV columns, or defaults
        const awayCity = parsedAway.city ||
          game.awayCity ||
          state.rawData[game.rowIndex]?.[state.columnMapping.awayCity || ""];
        const awayState = parsedAway.state ||
          game.awayState ||
          state.rawData[game.rowIndex]?.[state.columnMapping.awayState || ""] ||
          state.defaults.state || "";

        const awayResponse = await searchTeams({
          teamName: searchAwayName,
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
          normalizedAwayName,
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
