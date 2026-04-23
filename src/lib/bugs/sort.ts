import type { Bug } from "@/types/bug";

export const BUG_SORT_OPTIONS = ["updatedAt", "createdAt", "priority"] as const;

export type BugSortOption = (typeof BUG_SORT_OPTIONS)[number];

const PRIORITY_WEIGHT: Record<Bug["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function toEpoch(dateValue: Date | null): number {
  return dateValue ? dateValue.getTime() : Number.NEGATIVE_INFINITY;
}

export function compareBugsDeterministic(a: Bug, b: Bug): number {
  const updatedAtDelta = toEpoch(b.updatedAt) - toEpoch(a.updatedAt);
  if (updatedAtDelta !== 0) {
    return updatedAtDelta;
  }

  const createdAtDelta = toEpoch(b.createdAt) - toEpoch(a.createdAt);
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return a.id.localeCompare(b.id);
}

export function sortBugsDeterministic(bugs: Bug[]): Bug[] {
  return [...bugs].sort(compareBugsDeterministic);
}

export function compareBugsBySortOption(a: Bug, b: Bug, sortOption: BugSortOption): number {
  if (sortOption === "priority") {
    const priorityDelta = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return compareBugsDeterministic(a, b);
  }

  if (sortOption === "createdAt") {
    const createdAtDelta = toEpoch(b.createdAt) - toEpoch(a.createdAt);
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    const updatedAtDelta = toEpoch(b.updatedAt) - toEpoch(a.updatedAt);
    if (updatedAtDelta !== 0) {
      return updatedAtDelta;
    }

    return a.id.localeCompare(b.id);
  }

  return compareBugsDeterministic(a, b);
}

export function sortBugsByOption(bugs: Bug[], sortOption: BugSortOption): Bug[] {
  return [...bugs].sort((left, right) => compareBugsBySortOption(left, right, sortOption));
}
