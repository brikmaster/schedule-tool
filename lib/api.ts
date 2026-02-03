// ScoreStream API Client

import {
  TeamsSearchRequest,
  TeamsSearchResponse,
  GamesAddRequest,
  GamesAddResponse,
  GamesScoresAddRequest,
  GamesScoresAddResponse,
  Team,
  TeamPicture,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_SCORESTREAM_API_URL || "https://scorestream.com/api";
const API_KEY = process.env.NEXT_PUBLIC_SCORESTREAM_API_KEY || "";
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_SCORESTREAM_ACCESS_TOKEN || "";

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

  if (json.error) {
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

  // Build search params, filtering out undefined values
  const searchParams: any = {
    teamName: params.teamName,
    country: params.country || "US",
    recommendedFor: "addingGames",
    ignoreUserCreatedTeams: true,
    count: params.count || 10,
  };

  // Only add optional params if they have values
  if (params.city) searchParams.city = params.city;
  if (params.state) searchParams.state = params.state;
  if (params.orgId) searchParams.organizationIds = [params.orgId]; // API expects array of integers

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

export async function addScore(
  params: Omit<GamesScoresAddRequest, "apiKey">
): Promise<GamesScoresAddResponse> {
  const scoreParams: Omit<GamesScoresAddRequest, "apiKey"> = {
    accessToken: params.accessToken,
    gameId: params.gameId,
    homeTeamScore: params.homeTeamScore,
    awayTeamScore: params.awayTeamScore,
    gameSegmentId: params.gameSegmentId,
  };

  console.log('[API] games.scores.add request:', {
    gameId: params.gameId,
    homeTeamScore: params.homeTeamScore,
    awayTeamScore: params.awayTeamScore,
    gameSegmentId: params.gameSegmentId,
    hasAccessToken: !!params.accessToken,
  });

  const response = await jsonRpcCall<GamesScoresAddResponse>(
    "games.scores.add",
    scoreParams
  );

  console.log('[API] games.scores.add response:', response);

  return response;
}
