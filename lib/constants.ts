// ScoreStream Bulk Schedule Importer - Constants

import { SportName, SegmentType } from "@/types";

// Squad IDs
export const SQUAD_IDS = {
  VARSITY_BOYS: 1010,
  JV_BOYS: 1020,
  FRESHMAN_BOYS: 1030,
  VARSITY_GIRLS: 1040,
  JV_GIRLS: 1050,
  FRESHMAN_GIRLS: 1060,
} as const;

export const SQUADS = [
  { id: SQUAD_IDS.VARSITY_BOYS, label: "Varsity Boys" },
  { id: SQUAD_IDS.JV_BOYS, label: "JV Boys" },
  { id: SQUAD_IDS.FRESHMAN_BOYS, label: "Freshman Boys" },
  { id: SQUAD_IDS.VARSITY_GIRLS, label: "Varsity Girls" },
  { id: SQUAD_IDS.JV_GIRLS, label: "JV Girls" },
  { id: SQUAD_IDS.FRESHMAN_GIRLS, label: "Freshman Girls" },
];

// Sports
export const SPORTS: Array<{ name: SportName; label: string }> = [
  { name: "football", label: "Football" },
  { name: "basketball", label: "Basketball" },
  { name: "baseball", label: "Baseball" },
  { name: "softball", label: "Softball" },
  { name: "hockey", label: "Hockey" },
  { name: "volleyball", label: "Volleyball" },
  { name: "soccer", label: "Soccer" },
  { name: "lacrosse", label: "Lacrosse" },
  { name: "rugby", label: "Rugby" },
  { name: "waterpolo", label: "Water Polo" },
  { name: "fieldhockey", label: "Field Hockey" },
  { name: "ultimatefrisbee", label: "Ultimate Frisbee" },
  { name: "wrestling", label: "Wrestling" },
  { name: "netball", label: "Netball" },
  { name: "handball", label: "Handball" },
  { name: "flagfootball", label: "Flag Football" },
];

// Segment Types by Sport
export const SEGMENT_TYPES: Record<
  SportName,
  Array<{ value: SegmentType; label: string; isDefault?: boolean }>
> = {
  football: [
    { value: "quarter", label: "Quarter", isDefault: true },
    { value: "half", label: "Half" },
  ],
  basketball: [
    { value: "quarter", label: "Quarter", isDefault: true },
    { value: "half", label: "Half" },
  ],
  baseball: [
    { value: "inning-7", label: "7 Innings", isDefault: true },
    { value: "inning-3", label: "3 Innings" },
    { value: "inning-5", label: "5 Innings" },
    { value: "inning-9", label: "9 Innings" },
  ],
  softball: [
    { value: "inning-7", label: "7 Innings", isDefault: true },
    { value: "inning-5", label: "5 Innings" },
  ],
  soccer: [{ value: "half", label: "Half", isDefault: true }],
  volleyball: [
    { value: "game-5", label: "Best of 5", isDefault: true },
    { value: "game-3", label: "Best of 3" },
  ],
  hockey: [{ value: "period", label: "Period", isDefault: true }],
  lacrosse: [{ value: "quarter", label: "Quarter", isDefault: true }],
  rugby: [{ value: "half", label: "Half", isDefault: true }],
  waterpolo: [{ value: "quarter", label: "Quarter", isDefault: true }],
  fieldhockey: [{ value: "half", label: "Half", isDefault: true }],
  ultimatefrisbee: [{ value: "half", label: "Half", isDefault: true }],
  wrestling: [{ value: "period", label: "Period", isDefault: true }],
  netball: [{ value: "quarter", label: "Quarter", isDefault: true }],
  handball: [{ value: "half", label: "Half", isDefault: true }],
  flagfootball: [
    { value: "quarter", label: "Quarter", isDefault: true },
    { value: "half", label: "Half" },
  ],
};

// Get default segment type for a sport
export function getDefaultSegmentType(sport: SportName): SegmentType {
  const segments = SEGMENT_TYPES[sport];
  const defaultSegment = segments.find((s) => s.isDefault);
  return defaultSegment ? defaultSegment.value : segments[0].value;
}

// Final score segment ID (used when adding final scores to completed games)
export const FINAL_SEGMENT_ID = 1000;

// Common timezones
export const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Phoenix", label: "Arizona Time (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

// Organizations
export const ORGANIZATIONS = [
  { value: 1000, label: "High School" },
  { value: 1001, label: "NCAA" },
  { value: 1002, label: "NFL" },
  { value: 1003, label: "NBA" },
  { value: 1004, label: "MLB" },
  { value: 1005, label: "NHL" },
  { value: 1006, label: "MLS" },
  { value: -1, label: "Other (Custom)" },
];

// US States
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// File validation
export const FILE_LIMITS = {
  MAX_ROWS: 1000,
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ACCEPTED_TYPES: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ACCEPTED_EXTENSIONS: [".csv", ".xls", ".xlsx"],
};
