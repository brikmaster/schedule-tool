// ScoreStream Bulk Schedule Importer - Type Definitions

export type SportName =
  | "football"
  | "basketball"
  | "baseball"
  | "softball"
  | "hockey"
  | "volleyball"
  | "soccer"
  | "lacrosse"
  | "rugby"
  | "waterpolo"
  | "fieldhockey"
  | "ultimatefrisbee"
  | "wrestling"
  | "netball"
  | "handball"
  | "flagfootball";

export type SegmentType =
  | "quarter"
  | "half"
  | "period"
  | "inning-3"
  | "inning-5"
  | "inning-7"
  | "inning-9"
  | "game-3"
  | "game-5";

export type TeamStatus = "pending" | "matched" | "ambiguous" | "not_found";
export type GameStatus = "ready" | "ambiguous" | "error";
export type SubmissionState = "idle" | "submitting" | "complete";
export type SubmissionStatus = "created" | "duplicate" | "failed";

// Application State
export interface AppState {
  step: 1 | 2 | 3 | 4 | 5;
  file: File | null;
  rawData: Record<string, string>[];
  headers: string[];
  defaults: {
    sport: SportName | null;
    squadId: number | null;
    segmentType: SegmentType | null;
    timezone: string;
    state: string | null;
    orgId: number | null;
  };
  columnMapping: {
    date: string | null;
    time: string | null;
    homeTeam: string | null;
    awayTeam: string | null;
    homeCity?: string | null;
    homeState?: string | null;
    awayCity?: string | null;
    awayState?: string | null;
  };
  games: GameRow[];
  submission: {
    state: SubmissionState;
    results: SubmissionResult[];
  };
}

// Single game in the queue
export interface GameRow {
  id: string;
  rowIndex: number;
  date: string | null;
  time: string | null;
  homeTeam: TeamResolution;
  awayTeam: TeamResolution;
  status: GameStatus;
  selected: boolean;
}

// Team resolution state
export interface TeamResolution {
  originalText: string;
  status: TeamStatus;
  searchResults?: Team[];
  selectedTeam?: Team | null;
  confidence?: number;
}

// ScoreStream API Team
export interface Team {
  teamId: number;
  teamName: string;
  mascot1: string;
  city: string;
  state: string;
  minTeamName: string;
  shortTeamName: string;
  url: string;
  mascotTeamPictureIds: number[];
  squadIds: number[];
  orgId?: number;
  logoUrl?: string;
}

// Team Picture
export interface TeamPicture {
  teamPictureId: number;
  teamId: number;
  type: "mascot" | "background";
  max90Url: string;
  thumbnailUrl: string;
}

// Submission result
export interface SubmissionResult {
  gameRowId: string;
  status: SubmissionStatus;
  gameId?: number;
  gameUrl?: string;
  error?: string;
}

// API Request/Response Types
export interface TeamsSearchRequest {
  teamName: string;
  city?: string;
  state?: string;
  country?: string;
  orgId?: number;
  recommendedFor: "addingGames";
  ignoreUserCreatedTeams: boolean;
  count: number;
  apiKey: string;
}

export interface TeamsSearchResponse {
  result: {
    teamIds: number[];
    total: number;
    collections: {
      teamCollection: {
        list: Team[];
      };
      teamPictureCollection: {
        list: TeamPicture[];
      };
    };
  };
}

export interface GamesAddRequest {
  homeTeamId: number;
  awayTeamId: number;
  homeSquadId: number;
  awaySquadId: number;
  sportName: SportName;
  gameSegmentType: SegmentType;
  localStartDateTime?: string;
  localGameTimezone?: string;
  duplicateCheckWindow: "large";
  apiKey: string;
}

export interface GamesAddResponse {
  result: {
    gameId: number;
    url: string;
    isDuplicate?: boolean;
  };
}
