// Obscured signals (NR/SMTH Part 05 Module S22, TI 181): how far a driver must be able to read a
// signal, and what a reported obscuration means.
//
// Distance covered per second: mph × 0.489 yards (NR/SMS/PartZ/Z01 §4.1). A significant (high
// risk) obscuration affects 2 seconds or more of reading time at permissible speed; less than 2
// seconds is minor (low risk) and may be authorised for normal use for up to 72 hours; mitigated
// working may be signed back for up to 7 days.

export const YARDS_PER_MPH_SECOND = 0.489;
export const METRES_PER_MPH_SECOND = 0.447;
export const SIGNIFICANT_SECONDS = 2;
export const LOW_RISK_AUTHORISATION_HOURS = 72;
export const MITIGATED_SIGN_BACK_DAYS = 7;
export const SECTION_MANAGER_REVIEW_DAYS = 7;

export function viewingDistance(mph: number, seconds: number): { yards: number; metres: number } {
  return { yards: Math.round(mph * YARDS_PER_MPH_SECOND * seconds), metres: Math.round(mph * METRES_PER_MPH_SECOND * seconds) };
}

/** Seconds of reading time lost by an obstruction of the given length at the given speed. */
export function secondsObscured(mph: number, yards: number): number {
  if (mph <= 0) return 0;
  return yards / (mph * YARDS_PER_MPH_SECOND);
}

export type Obscuration = "difficult" | "becoming" | "negligible";
export type ObscurationRisk = "high" | "low" | "negligible";

export interface Classification {
  category: Obscuration;
  risk: ObscurationRisk;
  wrongSide: boolean;
  seconds: number;
  response: string;
}

/**
 * Classify a report. `withinMrd`: the obstruction sits between the Minimum Reading Distance and
 * the signal (a defect, wrong side failure). `affectsRrd`: it sits between the Required Reading
 * Distance and the MRD only (negligible). Otherwise the signal is becoming difficult to see.
 */
export function classify(mph: number, obstructionYards: number, withinMrd: boolean, affectsRrd: boolean): Classification {
  const seconds = secondsObscured(mph, obstructionYards);
  if (withinMrd) {
    const high = seconds >= SIGNIFICANT_SECONDS;
    return {
      category: "difficult",
      risk: high ? "high" : "low",
      wrongSide: true,
      seconds,
      response: high
        ? "Significant obscuration: mitigate now (ESR, temporary approach control, double-block working or clear on approach); SFI Level 3 may sign back mitigated working for up to 7 days."
        : "Minor obscuration: SFI Level 2 may authorise normal use for up to 72 hours from the report; notify operators of the raised SPAD risk.",
    };
  }
  if (affectsRrd) {
    return { category: "negligible", risk: "negligible", wrongSide: false, seconds, response: "Affects the Required Reading Distance only: Off-Track or vegetation allocation stays open until cleared or an M1 work order is raised." };
  }
  return { category: "becoming", risk: "low", wrongSide: false, seconds, response: "Becoming difficult to see: not a wrong side failure; arrange clearance before it is." };
}

/** The table in Z01 §5 for the speeds a desk meets. */
export const CHART_SPEEDS = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125];
export const CHART_SECONDS = [2, 4, 5, 10];
