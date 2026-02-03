"use client";

import React, { useState, useCallback } from "react";
import { FILE_LIMITS } from "@/lib/constants";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export default function FileDropzone({
  onFileSelect,
  accept = ".csv,.xlsx,.xls",
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["csv", "xlsx", "xls"].includes(extension || "")) {
      return "Invalid file type. Please upload a CSV or Excel file.";
    }

    // Check file size
    if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${FILE_LIMITS.MAX_SIZE_MB}MB.`;
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded p-12 text-center transition-colors ${
          isDragging
            ? "border-[var(--ss-primary)] bg-blue-50"
            : "border-[var(--ss-border)] bg-white"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <svg
            className="w-16 h-16 text-[var(--ss-text-light)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div>
            <p className="text-lg font-medium text-[var(--ss-text)]">
              Drag and drop your file here
            </p>
            <p className="text-sm text-[var(--ss-text-light)] mt-1">
              or click to browse
            </p>
          </div>
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="ss-button-primary cursor-pointer"
          >
            Choose File
          </label>
          <p className="text-xs text-[var(--ss-text-light)] mt-2">
            Accepts CSV and Excel files (max {FILE_LIMITS.MAX_SIZE_MB}MB, {FILE_LIMITS.MAX_ROWS}{" "}
            rows)
          </p>
        </div>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-[var(--ss-error)] rounded text-[var(--ss-error)] text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
