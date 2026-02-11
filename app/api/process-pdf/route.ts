import { NextRequest, NextResponse } from "next/server";

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8001";

// GET handler to check config
export async function GET() {
  return NextResponse.json({
    pdfServiceUrl: PDF_SERVICE_URL,
    timestamp: new Date().toISOString(),
  });
}

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
        { error: `[validation] File must be a PDF. serviceUrl=${PDF_SERVICE_URL}` },
        { status: 400 }
      );
    }

    // Read file into buffer to ensure clean forwarding
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: file.type || "application/pdf" });

    // Forward to Python service
    const pdfFormData = new FormData();
    pdfFormData.append("file", fileBlob, file.name);

    // Build URL with optional school parameter
    const url = school
      ? `${PDF_SERVICE_URL}/extract?school=${encodeURIComponent(school)}`
      : `${PDF_SERVICE_URL}/extract`;

    const response = await fetch(url, {
      method: "POST",
      body: pdfFormData,
    });

    if (!response.ok) {
      const rawBody = await response.text();
      return NextResponse.json(
        { success: false, error: `[upstream ${response.status}] fileSize=${fileBuffer.byteLength} fileName=${file.name} ${rawBody}` },
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
    console.error("PDF_SERVICE_URL was:", PDF_SERVICE_URL);
    return NextResponse.json(
      {
        success: false,
        error: `[catch] PDF service unavailable (${PDF_SERVICE_URL}). ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 503 }
    );
  }
}
