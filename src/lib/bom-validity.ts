import type { Bom, BomVersionValidityState } from "./types";

type VersionWindow = {
  status: "effective" | "draft" | "retired";
  effectiveAt: string | null;
  effectiveTo?: string | null;
};

export function getBomVersionValidityState(
  version: VersionWindow,
  asAt = new Date(),
): BomVersionValidityState {
  if (version.status === "draft") return "draft";
  const effectiveAt = version.effectiveAt ? new Date(version.effectiveAt) : null;
  const effectiveTo = version.effectiveTo ? new Date(version.effectiveTo) : null;
  if (effectiveAt && effectiveAt > asAt) return "scheduled";
  if (effectiveAt && effectiveAt <= asAt && (!effectiveTo || effectiveTo > asAt)) return "current";
  return "historical";
}

export function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function nextAvailableBomVersion(current: string, existing: string[]) {
  const used = new Set(existing);
  const match = current.match(/^(.*?)(\d+)$/);
  const prefix = match?.[1] ?? `${current}.`;
  let number = match ? Number(match[2]) + 1 : 1;
  let candidate = `${prefix}${number}`;
  while (used.has(candidate)) {
    number += 1;
    candidate = `${prefix}${number}`;
  }
  return candidate;
}

type BomVersionSummary = NonNullable<Bom["versions"]>[number];

function latestVersionActivity(version: BomVersionSummary) {
  return Math.max(
    0,
    ...(version.events ?? []).map((event) => new Date(event.createdAt).getTime()),
  );
}

export function findLatestBomDraft(
  bom: Pick<Bom, "status" | "versionId" | "versions">,
): BomVersionSummary | undefined {
  if (bom.status === "draft" && bom.versionId) {
    const selectedDraft = bom.versions?.find((version) => version.id === bom.versionId);
    if (selectedDraft?.status === "draft") return selectedDraft;
  }

  return (bom.versions ?? [])
    .filter((version) => version.status === "draft")
    .reduce<BomVersionSummary | undefined>((latest, candidate) => {
      if (!latest) return candidate;
      return latestVersionActivity(candidate) > latestVersionActivity(latest)
        ? candidate
        : latest;
    }, undefined);
}
