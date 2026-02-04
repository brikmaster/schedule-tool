"use client";

import React, { useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import { detectColumnMapping } from "@/lib/utils/columnDetection";
import Card from "@/components/ui/Card";
import Dropdown from "@/components/ui/Dropdown";
import Button from "@/components/ui/Button";
import { GameRow, TeamResolution } from "@/types";

export default function ColumnMapper() {
  const { state, dispatch } = useAppState();

  // Auto-skip if PDF (games already populated, no headers)
  useEffect(() => {
    if (state.headers.length === 0 && state.games.length > 0) {
      // This is a PDF - skip to game queue
      dispatch({ type: "SET_STEP", step: 4 });
    }
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    if (state.headers.length > 0 && !state.columnMapping.date) {
      const detected = detectColumnMapping(state.headers);
      dispatch({ type: "SET_COLUMN_MAPPING", mapping: detected });
    }
  }, [state.headers]);

  const handleNext = () => {
    console.log('[Column Mapper] Score columns mapped:', {
      homeScore: state.columnMapping.homeScore,
      awayScore: state.columnMapping.awayScore,
    });

    // Create games from raw data
    const games: GameRow[] = state.rawData.map((row, index) => {
      // Parse scores if columns are mapped
      const homeScoreStr = state.columnMapping.homeScore ? row[state.columnMapping.homeScore] : null;
      const awayScoreStr = state.columnMapping.awayScore ? row[state.columnMapping.awayScore] : null;

      const homeScore = homeScoreStr ? parseInt(homeScoreStr, 10) : null;
      const awayScore = awayScoreStr ? parseInt(awayScoreStr, 10) : null;

      if (index < 3) {
        console.log(`[Column Mapper] Game ${index + 1} scores:`, {
          homeScoreStr,
          awayScoreStr,
          homeScore,
          awayScore,
          isNaN: isNaN(homeScore!),
        });
      }

      return {
        id: `game-${index}`,
        rowIndex: index,
        date: row[state.columnMapping.date!] || null,
        time: row[state.columnMapping.time!] || null,
        homeTeam: {
          originalText: row[state.columnMapping.homeTeam!] || "",
          status: "pending",
        } as TeamResolution,
        awayTeam: {
          originalText: row[state.columnMapping.awayTeam!] || "",
          status: "pending",
        } as TeamResolution,
        homeScore: isNaN(homeScore!) ? null : homeScore,
        awayScore: isNaN(awayScore!) ? null : awayScore,
        status: "ambiguous",
        selected: true,
      };
    });

    dispatch({ type: "SET_GAMES", games });
    dispatch({ type: "SET_STEP", step: 4 });
  };

  const handleBack = () => {
    dispatch({ type: "SET_STEP", step: 2 });
  };

  const canProceed =
    state.columnMapping.date &&
    state.columnMapping.time &&
    state.columnMapping.homeTeam &&
    state.columnMapping.awayTeam;

  const columnOptions = state.headers.map((h) => ({ value: h, label: h }));

  // Get example values for preview
  const getExampleValue = (column: string | null | undefined) => {
    if (!column) return "—";
    return state.rawData[0]?.[column] || "—";
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-light text-[var(--ss-text-light)] text-center mb-8">
        Map Columns
      </h1>

      <p className="text-sm text-[var(--ss-text-light)] mb-6 text-center">
        We've detected your columns automatically. Review and adjust if needed.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ss-text)] uppercase mb-3">
            Required Fields
          </h3>
          <Dropdown
            label="Date Column"
            value={state.columnMapping.date || ""}
            onChange={(date) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { date } })
            }
            options={columnOptions}
            placeholder="Select date column"
            required
            helperText={`Example: ${getExampleValue(state.columnMapping.date)}`}
          />
          <Dropdown
            label="Time Column"
            value={state.columnMapping.time || ""}
            onChange={(time) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { time } })
            }
            options={columnOptions}
            placeholder="Select time column"
            required
            helperText={`Example: ${getExampleValue(state.columnMapping.time)}`}
          />
          <Dropdown
            label="Home Team Column"
            value={state.columnMapping.homeTeam || ""}
            onChange={(homeTeam) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { homeTeam } })
            }
            options={columnOptions}
            placeholder="Select home team column"
            required
            helperText={`Example: ${getExampleValue(state.columnMapping.homeTeam)}`}
          />
          <Dropdown
            label="Away Team Column"
            value={state.columnMapping.awayTeam || ""}
            onChange={(awayTeam) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { awayTeam } })
            }
            options={columnOptions}
            placeholder="Select away team column"
            required
            helperText={`Example: ${getExampleValue(state.columnMapping.awayTeam)}`}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--ss-text)] uppercase mb-3">
            Optional Fields
          </h3>
          <p className="text-xs text-[var(--ss-text-light)] mb-4">
            These fields improve team matching accuracy
          </p>
          <Dropdown
            label="Home City Column"
            value={state.columnMapping.homeCity || ""}
            onChange={(homeCity) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { homeCity } })
            }
            options={columnOptions}
            placeholder="None"
            helperText={`Example: ${getExampleValue(state.columnMapping.homeCity)}`}
          />
          <Dropdown
            label="Home State Column"
            value={state.columnMapping.homeState || ""}
            onChange={(homeState) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { homeState } })
            }
            options={columnOptions}
            placeholder="None"
            helperText={`Example: ${getExampleValue(state.columnMapping.homeState)}`}
          />
          <Dropdown
            label="Away City Column"
            value={state.columnMapping.awayCity || ""}
            onChange={(awayCity) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { awayCity } })
            }
            options={columnOptions}
            placeholder="None"
            helperText={`Example: ${getExampleValue(state.columnMapping.awayCity)}`}
          />
          <Dropdown
            label="Away State Column"
            value={state.columnMapping.awayState || ""}
            onChange={(awayState) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { awayState } })
            }
            options={columnOptions}
            placeholder="None"
            helperText={`Example: ${getExampleValue(state.columnMapping.awayState)}`}
          />
          <Dropdown
            label="Home Score Column"
            value={state.columnMapping.homeScore || ""}
            onChange={(homeScore) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { homeScore } })
            }
            options={columnOptions}
            placeholder="None (for future games)"
            helperText={`Example: ${getExampleValue(state.columnMapping.homeScore)}`}
          />
          <Dropdown
            label="Away Score Column"
            value={state.columnMapping.awayScore || ""}
            onChange={(awayScore) =>
              dispatch({ type: "SET_COLUMN_MAPPING", mapping: { awayScore } })
            }
            options={columnOptions}
            placeholder="None (for future games)"
            helperText={`Example: ${getExampleValue(state.columnMapping.awayScore)}`}
          />
        </div>
      </div>

      {canProceed && (
        <div className="p-4 bg-green-50 border border-[var(--ss-success)] rounded mb-6 text-center">
          <p className="text-[var(--ss-success)] font-medium">
            ✓ Looks good! All required fields are mapped.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={handleBack}>
          Previous
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </Card>
  );
}
