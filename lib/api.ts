// ScoreStream API Client

import {
  TeamsSearchRequest,
  TeamsSearchResponse,
  GamesAddRequest,
  GamesAddResponse,
  Team,
  TeamPicture,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_SCORESTREAM_API_URL || "https://scorestream.com/api";
const API_KEY = process.env.NEXT_PUBLIC_SCORESTREAM_API_KEY || "";
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN || "";

// Debug: Log if credentials are missing (only first 4 chars for security)
if (typeof window !== 'undefined') {
  console.log('[API Debug] URL:', API_URL);
  console.log('[API Debug] API_KEY:', API_KEY ? API_KEY.substring(0, 4) + '...' : 'MISSING');
  console.log('[API Debug] ACCESS_TOKEN:', ACCESS_TOKEN ? ACCESS_TOKEN.substring(0, 4) + '...' : 'MISSING');
}

// JSON-RPC 2.0 wrapper
async function jsonRpcCall<T>(method: string, params: Record<string, any>): Promise<T> {
  const requestBody = {
    jsonrpc: "2.0",
    method,
    params: {
      ...params,
      apiKey: API_KEY,
      accessToken: ACCESS_TOKEN
    },
    id: Date.now(),
  };

  console.log('[API Debug] Request:', {
    method,
    teamName: params.teamName,
    hasApiKey: !!API_KEY,
    hasAccessToken: !!ACCESS_TOKEN
  });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();

  // Debug: Log API response
  console.log('[API Debug] Response:', {
    method,
    status: response.status,
    hasError: !!json.error,
    hasResult: !!json.result,
    resultPreview: json.result ? Object.keys(json.result) : 'N/A'
  });

  if (json.error) {
    console.error('[API Debug] API Error:', json.error);
    throw new Error(json.error.message || "API error occurred");
  }

  return json as T;
}

export async function searchTeams(
  params: Omit<TeamsSearchRequest, "apiKey">
): Promise<TeamsSearchResponse> {
  // Validate teamName length
  if (params.teamName.length < 3 || params.teamName.length > 256) {
    throw new Error("Team name must be between 3 and 256 characters");
  }

  const searchParams: Omit<TeamsSearchRequest, "apiKey"> = {
    teamName: params.teamName,
    city: params.city,
    state: params.state,
    country: params.country || "US",
    orgId: params.orgId,
    recommendedFor: "addingGames",
    ignoreUserCreatedTeams: true,
    count: params.count || 10,
  };

  const response = await jsonRpcCall<TeamsSearchResponse>(
    "teams.search",
    searchParams
  );

  // Attach logo URLs to teams
  if (response.result?.collections) {
    const { teamCollection, teamPictureCollection } = response.result.collections;

    if (teamCollection?.list && teamPictureCollection?.list) {
      teamCollection.list.forEach((team: Team) => {
        const mascotPicture = teamPictureCollection.list.find(
          (pic: TeamPicture) =>
            team.mascotTeamPictureIds?.includes(pic.teamPictureId) &&
            pic.type === "mascot"
        );
        if (mascotPicture) {
          team.logoUrl = mascotPicture.thumbnailUrl || mascotPicture.max90Url;
        }
      });
    }
  }

  return response;
}

export async function addGame(
  params: Omit<GamesAddRequest, "apiKey">
): Promise<GamesAddResponse> {
  const gameParams: Omit<GamesAddRequest, "apiKey"> = {
    homeTeamId: params.homeTeamId,
    awayTeamId: params.awayTeamId,
    homeSquadId: params.homeSquadId,
    awaySquadId: params.awaySquadId,
    sportName: params.sportName,
    gameSegmentType: params.gameSegmentType,
    localStartDateTime: params.localStartDateTime,
    localGameTimezone: params.localGameTimezone,
    duplicateCheckWindow: "large",
  };

  const response = await jsonRpcCall<GamesAddResponse>(
    "games.add",
    gameParams
  );

  return response;
}
