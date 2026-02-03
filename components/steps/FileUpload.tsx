"use client";

import React, { useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { parseFile } from "@/lib/parsers";
import FileDropzone from "@/components/ui/FileDropzone";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function FileUpload() {
  const { state, dispatch } = useAppState();
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setParsing(true);
    setError(null);

    try {
      const result = await parseFile(file);

      dispatch({
        type: "SET_FILE",
        file,
        headers: result.headers,
        rawData: result.data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  };

  const handleRemove = () => {
    dispatch({ type: "RESET" });
    setError(null);
  };

  const handleNext = () => {
    dispatch({ type: "SET_STEP", step: 2 });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-light text-[var(--ss-text-light)] text-center mb-8">
        Bulk Schedule Importer
      </h1>

      {!state.file ? (
        <FileDropzone onFileSelect={handleFileSelect} />
      ) : (
        <div>
          <div className="mb-6 p-4 bg-green-50 border border-[var(--ss-success)] rounded">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--ss-success)]">
                  File uploaded successfully
                </p>
                <p className="text-sm text-[var(--ss-text-light)] mt-1">
                  {state.file.name} ({(state.file.size / 1024).toFixed(1)} KB, {state.rawData.length} rows)
                </p>
              </div>
              <Button variant="secondary" onClick={handleRemove}>
                Remove
              </Button>
            </div>
          </div>

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

          <div className="flex justify-end">
            <Button onClick={handleNext}>Next</Button>
          </div>
        </div>
      )}

      {parsing && (
        <div className="mt-4 text-center text-[var(--ss-text-light)]">
          Parsing file...
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-[var(--ss-error)] rounded text-[var(--ss-error)] text-sm">
          {error}
        </div>
      )}
    </Card>
  );
}
