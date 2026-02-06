import { NextRequest, NextResponse } from "next/server";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8001";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Get optional school query parameter
    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");

    // Validation
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Forward to Python service
    const pdfFormData = new FormData();
    pdfFormData.append("file", file);

    // Build URL with optional school parameter
    const url = school
      ? `${PDF_SERVICE_URL}/extract?school=${encodeURIComponent(school)}`
      : `${PDF_SERVICE_URL}/extract`;

    const response = await fetch(url, {
      method: "POST",
      body: pdfFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.detail || "Failed to process PDF" },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Include ALL games (both completed and upcoming)
    // Completed games will have scores attached
    const allGames = result.games;
    const completedCount = result.games.filter((g: any) => g.isCompleted).length;
    const upcomingCount = result.games.length - completedCount;

    return NextResponse.json({
      ...result,
      games: allGames,
      gameCount: allGames.length,
      completedGamesCount: completedCount,
      upcomingGamesCount: upcomingCount,
      totalGamesInPdf: result.games.length,
    });
  } catch (error) {
    console.error("PDF service error:", error);
    return NextResponse.json(
      { success: false, error: "PDF service unavailable. Make sure the Python service is running on port 8001." },
      { status: 503 }
    );
  }
}
