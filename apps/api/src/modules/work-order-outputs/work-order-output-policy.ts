import type { RecipeSnapshot } from "../boms/recipe-snapshot.js";

export type OutputDecision = "released" | "rejected";

export interface QualityInspectionCandidate {
  decision: OutputDecision;
  measuredTemperature: number;
  temperatureMin: number | null;
  temperatureMax: number | null;
  appearancePassed: boolean;
  packageSealPassed: boolean;
  labelPassed: boolean;
  note?: string;
}

export type QualityInspectionIssue =
  | "release_check_failed"
  | "temperature_out_of_range"
  | "rejection_note_required";

export function frozenOutputTemperatureRange(snapshot: RecipeSnapshot) {
  const lastOperation = [...(snapshot.operations ?? [])]
    .sort((left, right) => right.sequence - left.sequence)[0];
  return {
    temperatureMin: lastOperation?.temperatureMin ?? null,
    temperatureMax: lastOperation?.temperatureMax ?? null,
  };
}

export function getQualityInspectionIssue(
  candidate: QualityInspectionCandidate,
): QualityInspectionIssue | undefined {
  if (candidate.decision === "rejected") {
    return candidate.note?.trim() ? undefined : "rejection_note_required";
  }
  if (!candidate.appearancePassed || !candidate.packageSealPassed || !candidate.labelPassed) {
    return "release_check_failed";
  }
  if (
    (candidate.temperatureMin !== null && candidate.measuredTemperature < candidate.temperatureMin)
    || (candidate.temperatureMax !== null && candidate.measuredTemperature > candidate.temperatureMax)
  ) {
    return "temperature_out_of_range";
  }
  return undefined;
}
