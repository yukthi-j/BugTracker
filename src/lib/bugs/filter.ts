import type { Bug, BugStatus } from "@/types/bug";

export function matchesSearchQuery(bug: Bug, searchQuery: string): boolean {
  if (!searchQuery.trim()) {
    return true;
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  return (
    bug.title.toLowerCase().includes(normalizedQuery) || bug.description.toLowerCase().includes(normalizedQuery)
  );
}

export function filterBugsByQueryAndStatus(
  bugs: Bug[],
  searchQuery: string,
  activeStatuses: BugStatus[],
): Bug[] {
  const visibleStatuses = new Set(activeStatuses);
  return bugs.filter((bug) => visibleStatuses.has(bug.status) && matchesSearchQuery(bug, searchQuery));
}