// File Parsing - CSV and Excel

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FILE_LIMITS } from "./constants";

export interface ParseResult {
  headers: string[];
  data: Record<string, string>[];
}

// Common column keywords to detect the header row
const HEADER_KEYWORDS = [
  "date",
  "time",
  "team",
  "home",
  "away",
  "opponent",
  "location",
  "venue",
  "city",
  "state",
];

// Detect which row contains the actual column headers
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i];
    const lowerRow = row.map((cell) => cell.toLowerCase().trim());

    // Check if this row contains at least 2 header keywords
    const matchCount = lowerRow.filter((cell) =>
      HEADER_KEYWORDS.some((keyword) => cell.includes(keyword))
    ).length;

    if (matchCount >= 2) {
      return i;
    }
  }

  // Default to first row if no match found
  return 0;
}

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    // First pass: parse without headers to detect the header row
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as string[][];

        if (rawRows.length === 0) {
          reject(new Error("CSV file is empty"));
          return;
        }

        // Find the header row
        const headerRowIndex = findHeaderRow(rawRows);
        const headers = rawRows[headerRowIndex];

        // Get data rows (everything after the header row)
        const dataRows = rawRows.slice(headerRowIndex + 1);

        if (dataRows.length === 0) {
          reject(new Error("CSV file has no data rows after headers"));
          return;
        }

        if (dataRows.length > FILE_LIMITS.MAX_ROWS) {
          reject(
            new Error(
              `File exceeds maximum of ${FILE_LIMITS.MAX_ROWS} rows. Found ${dataRows.length} rows.`
            )
          );
          return;
        }

        // Convert rows to objects
        const data = dataRows.map((row) => {
          const obj: Record<string, string> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || "";
          });
          return obj;
        });

        resolve({ headers, data });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

export async function parseExcel(file: File): Promise<ParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    if (workbook.SheetNames.length === 0) {
      throw new Error("Excel file has no sheets");
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    // Parse as array of arrays first to detect header row
    const rawRows = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as string[][];

    if (rawRows.length === 0) {
      throw new Error("Excel sheet is empty");
    }

    // Find the header row
    const headerRowIndex = findHeaderRow(rawRows);
    const headers = rawRows[headerRowIndex];

    // Get data rows (everything after the header row)
    const dataRows = rawRows.slice(headerRowIndex + 1);

    if (dataRows.length === 0) {
      throw new Error("Excel sheet has no data rows after headers");
    }

    if (dataRows.length > FILE_LIMITS.MAX_ROWS) {
      throw new Error(
        `File exceeds maximum of ${FILE_LIMITS.MAX_ROWS} rows. Found ${dataRows.length} rows.`
      );
    }

    // Convert rows to objects
    const data = dataRows.map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    return { headers, data };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to parse Excel file");
  }
}

export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.toLowerCase().split(".").pop();

  if (extension === "csv") {
    return parseCSV(file);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseExcel(file);
  } else {
    throw new Error("Unsupported file type. Please upload a CSV or Excel file.");
  }
}
