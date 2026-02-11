"use client";

import React, { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { parseFile } from "@/lib/parsers";
import FileDropzone from "@/components/ui/FileDropzone";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface AvailableSchool {
  name: string;
  gameCount: number;
}

export default function FileUpload() {
  const { state, dispatch } = useAppState();
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [availableSchools, setAvailableSchools] = useState<AvailableSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File, schoolName?: string) => {
    setParsing(true);
    setError(null);
    setInfo(null);

    const extension = file.name.toLowerCase().split('.').pop();

    try {
      if (extension === 'pdf') {
        // PDF extraction flow
        setProcessingStatus("Extracting schedule from PDF...");

        const formData = new FormData();
        formData.append("file", file);

        // Add school parameter if provided
        const url = schoolName
          ? `/api/process-pdf?school=${encodeURIComponent(schoolName)}`
          : "/api/process-pdf";

        const response = await fetch(url, {
          method: "POST",
          body: formData
        });

        const result = await response.json();

        // Check for specific error messages first
        if (result.error) {
          setError(result.error);
          return;
        }

        // Check if school selection is required
        if (result.requiresSchoolSelection && result.availableSchools) {
          setAvailableSchools(result.availableSchools);
          setPendingFile(file);
          setParsing(false);
          setProcessingStatus(null);
          return; // Wait for school selection
        }

        if (!result.success || result.gameCount === 0) {
          setError(
            "Couldn't extract schedule from this PDF. This can happen with:\n" +
            "• Scanned or image-based PDFs\n" +
            "• Complex or unusual layouts\n\n" +
            "Try exporting as CSV or Excel instead."
          );
          return;
        }

        // Show info about completed games
        if (result.completedGamesCount > 0) {
          setInfo(`${result.completedGamesCount} completed games with scores, ${result.upcomingGamesCount} upcoming games.`);
        }

        // Map PDF data to GameRow format
        const games = result.games.map((g: any, i: number) => ({
          id: `game-${i}`,
          rowIndex: i,
          date: g.date,
          time: g.time,
          homeTeam: {
            originalText: g.homeTeam || "",
            status: "pending" as const
          },
          awayTeam: {
            originalText: g.awayTeam || "",
            status: "pending" as const
          },
          homeCity: g.homeCity,
          homeState: g.homeState,
          awayCity: g.awayCity,
          awayState: g.awayState,
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          status: "ready" as const,
          selected: true
        }));

        // Store extracted data
        dispatch({
          type: "SET_GAMES_FROM_PDF",
          file,
          games,
          pdfMetadata: {
            mainTeam: result.mainTeam,
            completedGamesCount: result.completedGamesCount || 0,
            upcomingGamesCount: result.upcomingGamesCount || 0,
            totalGamesInPdf: result.totalGamesInPdf
          }
        });

        // Skip column mapping, go directly to Configure Defaults (Step 2)
        dispatch({ type: "SET_STEP", step: 2 });

      } else {
        // Existing CSV/Excel flow
        const result = await parseFile(file);

        dispatch({
          type: "SET_FILE",
          file,
          headers: result.headers,
          rawData: result.data,
        });

        // Continue to next step (Configure Defaults)
        dispatch({ type: "SET_STEP", step: 2 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setParsing(false);
      setProcessingStatus(null);
    }
  };

  const handleRemove = () => {
    dispatch({ type: "RESET" });
    setError(null);
    setInfo(null);
    setAvailableSchools([]);
    setSelectedSchool("");
    setPendingFile(null);
  };

  const handleSchoolSelection = async () => {
    if (!selectedSchool || !pendingFile) return;

    // Re-process PDF with selected school
    await handleFileSelect(pendingFile, selectedSchool);

    // Clear school selection state
    setAvailableSchools([]);
    setSelectedSchool("");
    setPendingFile(null);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-light text-[var(--ss-text-light)] text-center mb-8">
        Bulk Schedule Importer
      </h1>

      {/* School Selection UI */}
      {availableSchools.length > 0 && (
        <div className="mb-6">
          <div className="p-6 bg-blue-50 border border-blue-400 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Multiple Schools Detected
            </h2>
            <p className="text-blue-700 mb-4">
              This PDF contains schedules for {availableSchools.length} schools. Please select which school you want to import:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Select School
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full px-4 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a school --</option>
                <option value="__all__">
                  All Schools ({availableSchools.reduce((sum, s) => sum + s.gameCount, 0)} games)
                </option>
                {availableSchools.map((school) => (
                  <option key={school.name} value={school.name}>
                    {school.name} ({school.gameCount} games)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSchoolSelection}
                disabled={!selectedSchool}
                className="flex-1"
              >
                Import {selectedSchool || "Selected School"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRemove}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {!state.file && availableSchools.length === 0 ? (
        <FileDropzone onFileSelect={handleFileSelect} />
      ) : availableSchools.length === 0 && state.file ? (
        <div>
          <div className="mb-6 p-4 bg-green-50 border border-[var(--ss-success)] rounded">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--ss-success)]">
                  File uploaded successfully
                </p>
                <p className="text-sm text-[var(--ss-text-light)] mt-1">
                  {state.file.name} ({(state.file.size / 1024).toFixed(1)} KB)
                  {state.games.length > 0 && ` - ${state.games.length} games ready`}
                  {state.rawData.length > 0 && ` - ${state.rawData.length} rows`}
                </p>
                {state.pdfMetadata && (
                  <p className="text-sm text-[var(--ss-text-light)] mt-1">
                    Main Team: {state.pdfMetadata.mainTeam}
                  </p>
                )}
              </div>
              <Button variant="secondary" onClick={handleRemove}>
                Remove
              </Button>
            </div>
          </div>

          {state.headers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[var(--ss-text)] uppercase mb-3">
                Preview (First 5 Rows)
              </h3>
              <div className="overflow-x-auto border border-[var(--ss-border)] rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {state.headers.map((header, i) => (
                        <th
                          key={i}
                          className="px-4 py-2 text-left text-[var(--ss-text)] font-medium border-b border-[var(--ss-border)]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.rawData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {state.headers.map((header, j) => (
                          <td
                            key={j}
                            className="px-4 py-2 text-[var(--ss-text)] border-b border-[var(--ss-border)]"
                          >
                            {row[header] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {state.rawData.length > 5 && (
                <p className="text-xs text-[var(--ss-text-light)] mt-2">
                  Showing 5 of {state.rawData.length} rows
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {parsing && (
        <div className="mt-4 text-center text-[var(--ss-text-light)]">
          {processingStatus || "Parsing file..."}
        </div>
      )}

      {info && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-400 rounded text-blue-700 text-sm">
          {info}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-[var(--ss-error)] rounded text-[var(--ss-error)] text-sm whitespace-pre-line">
          {error}
        </div>
      )}
    </Card>
  );
}
