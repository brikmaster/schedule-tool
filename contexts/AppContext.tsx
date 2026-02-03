"use client";

import React, { createContext, useReducer, Dispatch } from "react";
import { AppState, GameRow, TeamResolution, SubmissionResult } from "@/types";

// Action types
export type AppAction =
  | { type: "SET_STEP"; step: 1 | 2 | 3 | 4 | 5 }
  | {
      type: "SET_FILE";
      file: File;
      headers: string[];
      rawData: Record<string, string>[];
    }
  | { type: "SET_DEFAULTS"; defaults: Partial<AppState["defaults"]> }
  | {
      type: "SET_COLUMN_MAPPING";
      mapping: Partial<AppState["columnMapping"]>;
    }
  | { type: "SET_GAMES"; games: GameRow[] }
  | { type: "UPDATE_GAME"; id: string; updates: Partial<GameRow> }
  | { type: "TOGGLE_GAME_SELECTION"; id: string }
  | { type: "SELECT_ALL_GAMES"; selected: boolean }
  | {
      type: "UPDATE_TEAM_RESOLUTION";
      gameId: string;
      team: "home" | "away";
      resolution: Partial<TeamResolution>;
    }
  | {
      type: "SET_SUBMISSION_STATE";
      state: "idle" | "submitting" | "complete";
      results?: SubmissionResult[];
    }
  | { type: "RESET" };

// Initial state
const initialState: AppState = {
  step: 1,
  file: null,
  rawData: [],
  headers: [],
  defaults: {
    sport: null,
    squadId: null,
    segmentType: null,
    timezone: "America/Los_Angeles",
    state: null,
    orgId: 1000, // Default to High School
  },
  columnMapping: {
    date: null,
    time: null,
    homeTeam: null,
    awayTeam: null,
    homeCity: null,
    homeState: null,
    awayCity: null,
    awayState: null,
  },
  games: [],
  submission: {
    state: "idle",
    results: [],
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };

    case "SET_FILE":
      return {
        ...state,
        file: action.file,
        headers: action.headers,
        rawData: action.rawData,
      };

    case "SET_DEFAULTS":
      return {
        ...state,
        defaults: { ...state.defaults, ...action.defaults },
      };

    case "SET_COLUMN_MAPPING":
      return {
        ...state,
        columnMapping: { ...state.columnMapping, ...action.mapping },
      };

    case "SET_GAMES":
      return { ...state, games: action.games };

    case "UPDATE_GAME":
      return {
        ...state,
        games: state.games.map((game) =>
          game.id === action.id ? { ...game, ...action.updates } : game
        ),
      };

    case "TOGGLE_GAME_SELECTION":
      return {
        ...state,
        games: state.games.map((game) =>
          game.id === action.id ? { ...game, selected: !game.selected } : game
        ),
      };

    case "SELECT_ALL_GAMES":
      return {
        ...state,
        games: state.games.map((game) =>
          game.status === "ready"
            ? { ...game, selected: action.selected }
            : game
        ),
      };

    case "UPDATE_TEAM_RESOLUTION":
      return {
        ...state,
        games: state.games.map((game) => {
          if (game.id !== action.gameId) return game;

          const teamKey = action.team === "home" ? "homeTeam" : "awayTeam";
          const updatedTeam = { ...game[teamKey], ...action.resolution };

          // Update game status based on both teams
          const homeStatus =
            teamKey === "homeTeam" ? updatedTeam.status : game.homeTeam.status;
          const awayStatus =
            teamKey === "awayTeam" ? updatedTeam.status : game.awayTeam.status;

          let gameStatus = game.status;
          if (homeStatus === "matched" && awayStatus === "matched") {
            gameStatus = "ready";
          } else if (
            homeStatus === "not_found" ||
            awayStatus === "not_found"
          ) {
            gameStatus = "error";
          } else if (
            homeStatus === "ambiguous" ||
            awayStatus === "ambiguous"
          ) {
            gameStatus = "ambiguous";
          }

          return {
            ...game,
            [teamKey]: updatedTeam,
            status: gameStatus,
          };
        }),
      };

    case "SET_SUBMISSION_STATE":
      return {
        ...state,
        submission: {
          state: action.state,
          results: action.results || state.submission.results,
        },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// Context
export const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
} | null>(null);

// Provider
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
