import { GameSegment } from "@/types";
import { FINAL_SEGMENT_ID, TOTAL_SEGMENT_ID } from "@/lib/constants";

export interface SegmentSelection {
  gameSegmentId: number;
  source: 'final-by-id' | 'final-by-name' | 'total-fallback' | 'known-final-id';
  segmentName?: string;
}

/**
 * Selects the appropriate game segment for final score submission.
 * Priority:
 * 1. Look for Final segment by ID (19999) in boxScores
 * 2. Look for Final segment by name in boxScores
 * 3. Use known Final segment ID (19999) directly
 * 4. Fallback to Total segment (19888)
 */
export function selectFinalSegment(boxScores: GameSegment[]): SegmentSelection {
  console.log('[Segment Selector] Searching for Final segment in:',
    boxScores.map(s => ({ id: s.gameSegmentId, name: s.segmentName })));

  // Strategy 1: Look for Final segment by exact ID (19999)
  const finalById = boxScores.find(seg => seg.gameSegmentId === FINAL_SEGMENT_ID);
  if (finalById) {
    console.log('[Segment Selector] Found Final segment by ID:', finalById.gameSegmentId);
    return {
      gameSegmentId: finalById.gameSegmentId,
      source: 'final-by-id',
      segmentName: finalById.segmentName
    };
  }

  // Strategy 2: Look for segment with "Final" in name
  const finalByName = boxScores.find(seg =>
    seg.segmentName?.toLowerCase().includes('final') ||
    seg.segmentName?.toLowerCase() === 'game' ||
    seg.segmentName?.toLowerCase() === 'f'
  );
  if (finalByName) {
    console.log('[Segment Selector] Found Final segment by name:', finalByName);
    return {
      gameSegmentId: finalByName.gameSegmentId,
      source: 'final-by-name',
      segmentName: finalByName.segmentName
    };
  }

  // Strategy 3: Use known Final segment ID directly (even if not in boxScores array)
  // This is the PRIMARY strategy since boxScores often doesn't include Final
  console.log('[Segment Selector] Final not in boxScores, using known ID:', FINAL_SEGMENT_ID);
  return {
    gameSegmentId: FINAL_SEGMENT_ID,
    source: 'known-final-id'
  };

  // Note: We DON'T fallback to Total (19888) anymore since user confirmed
  // "Final comes after Total" - we should always use Final (19999)
}
