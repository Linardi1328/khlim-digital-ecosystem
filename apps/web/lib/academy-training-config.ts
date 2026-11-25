/**
 * Owner-approved static Academy training information for public display.
 *
 * IMPORTANT ARCHITECTURAL BOUNDARY (RIC-184 / RIC-190 / RIC-191):
 * - This module intentionally contains ONLY confirmed static venue/coach/slot
 *   details and the explicitly labelled proposed working practice day.
 * - It MUST NOT invent or hardcode session dates, capacity, remaining spots,
 *   or booking confirmation state.
 * - The future RIC-191 Academy Registration V1 interface MUST consume the
 *   authoritative RIC-190 backend session configuration API rather than
 *   duplicating hardcoded availability from this file.
 */

export interface AcademyVenueInfo {
  readonly name: string;
  readonly addressLine: string;
  readonly fullAddress: string;
  readonly directionsUrl: string;
  readonly status: "confirmed";
}

export interface AcademyTrainingSessionSlot {
  readonly id: "ages-10-12" | "ages-13-15";
  readonly pathwayCode: "U12" | "U15";
  readonly ageGroupKey: string;
  readonly timeRange: string;
  readonly summaryKey: string;
  readonly status: "confirmed";
}

export interface AcademyPracticeDayProposal {
  readonly dayKey: string;
  readonly status: "proposed";
}

export const ACADEMY_TRAINING_VENUE: AcademyVenueInfo = {
  name: "Sports Garage",
  addressLine:
    "The Annex 4, Jalan 19/1, Seksyen 19, 46300 Petaling Jaya, Selangor",
  fullAddress:
    "Sports Garage, The Annex 4, Jalan 19/1, Seksyen 19, 46300 Petaling Jaya, Selangor",
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=Sports+Garage%2C+The+Annex+4%2C+Jalan+19%2F1%2C+Seksyen+19%2C+46300+Petaling+Jaya%2C+Selangor",
  status: "confirmed",
};

export const ACADEMY_LEAD_COACH = {
  id: "seng-jun",
  displayName: "Sengjun",
  status: "confirmed",
} as const;

export const ACADEMY_WORKING_PRACTICE_DAY: AcademyPracticeDayProposal = {
  dayKey: "academy.trainingSessions.workingDayValue",
  status: "proposed",
};

export const ACADEMY_TRAINING_SESSIONS: readonly AcademyTrainingSessionSlot[] =
  [
    {
      id: "ages-10-12",
      pathwayCode: "U12",
      ageGroupKey: "academy.trainingSessions.slot10to12.ageGroup",
      timeRange: "2:00–4:00 PM",
      summaryKey: "academy.trainingSessions.slot10to12.summary",
      status: "confirmed",
    },
    {
      id: "ages-13-15",
      pathwayCode: "U15",
      ageGroupKey: "academy.trainingSessions.slot13to15.ageGroup",
      timeRange: "4:00–6:00 PM",
      summaryKey: "academy.trainingSessions.slot13to15.summary",
      status: "confirmed",
    },
  ];
