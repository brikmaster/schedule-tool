import { NextRequest, NextResponse } from "next/server";
import { extractWithVision } from "@/lib/pdf-processor";

export const maxDuration = 60;

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8001";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();

    // Step 1: Always try pdfplumber first
    const fileBlob = new Blob([fileBuffer], { type: file.type || "application/pdf" });
    const pdfFormData = new FormData();
    pdfFormData.append("file", fileBlob, file.name);

    const url = school
      ? `${PDF_SERVICE_URL}/extract?school=${encodeURIComponent(school)}`
      : `${PDF_SERVICE_URL}/extract`;

    let pdfplumberError: string | null = null;

    try {
      const response = await fetch(url, {
        method: "POST",
        body: pdfFormData,
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const result = await response.json();

        // Step 2: If requiresSchoolSelection, return immediately
        if (result.requiresSchoolSelection) {
          return NextResponse.json({ ...result, source: "pdfplumber" });
        }

        const allGames = result.games || [];

        // pdfplumber found games — return them
        if (allGames.length > 0) {
          const completedCount = allGames.filter((g: any) => g.isCompleted).length;
          const upcomingCount = allGames.length - completedCount;
          return NextResponse.json({
            ...result,
            games: allGames,
            gameCount: allGames.length,
            completedGamesCount: completedCount,
            upcomingGamesCount: upcomingCount,
            totalGamesInPdf: allGames.length,
            source: "pdfplumber",
          });
        }

        // Step 3: pdfplumber returned 0 games — fall through to vision
        console.log("[pdfplumber] 0 games extracted, will try vision fallback");
        pdfplumberError = "No games extracted";
      } else {
        // Step 4: pdfplumber HTTP error — fall through to vision
        const error = await response.json().catch(() => ({ detail: "Unknown error" }));
        pdfplumberError = error.detail || "Failed to process PDF";
        console.log(`[pdfplumber] Error (${response.status}): ${pdfplumberError}`);
      }
    } catch (err) {
      pdfplumberError = err instanceof Error ? err.message : "pdfplumber fetch failed";
      console.log(`[pdfplumber] Fetch error: ${pdfplumberError}`);
    }

    // Step 3/4: Try vision fallback (only if API key set and not in school-selection flow)
    let visionError: string | null = null;
    if (process.env.ANTHROPIC_API_KEY && !school) {
      try {
        console.log("[vision] Attempting Claude Vision extraction");
        const visionResult = await extractWithVision(fileBuffer, file.name);
        if (visionResult.games.length > 0) {
          const completedCount = visionResult.games.filter((g) => g.isCompleted).length;
          const upcomingCount = visionResult.games.length - completedCount;
          return NextResponse.json({
            success: true,
            games: visionResult.games,
            mainTeam: visionResult.mainTeam,
            format: visionResult.format,
            gameCount: visionResult.games.length,
            completedGamesCount: completedCount,
            upcomingGamesCount: upcomingCount,
            totalGamesInPdf: visionResult.games.length,
            source: "vision",
          });
        }
        visionError = `Vision returned 0 games (${visionResult.debug})`;
        console.log("[vision] 0 games extracted:", visionResult.debug);
      } catch (err) {
        visionError = err instanceof Error ? err.message : String(err);
        console.log("[vision] Error:", visionError);
      }
    } else if (!process.env.ANTHROPIC_API_KEY) {
      visionError = "ANTHROPIC_API_KEY not set";
    }

    // Step 5: Both failed — return details from both attempts
    const errorDetail = [
      `pdfplumber: ${pdfplumberError || "unknown"}`,
      `vision: ${visionError || "skipped"}`,
    ].join("; ");
    console.log(`[both-failed] ${errorDetail}`);
    return NextResponse.json(
      { success: false, error: `No games extracted. ${errorDetail}` },
      { status: 422 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[catch] PDF processing error:", msg);
    return NextResponse.json(
      { success: false, error: `PDF processing failed: ${msg}` },
      { status: 503 }
    );
  }
}
